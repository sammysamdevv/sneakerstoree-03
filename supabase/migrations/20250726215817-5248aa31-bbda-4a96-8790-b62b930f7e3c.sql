-- Create affiliate clicks tracking table
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  referrer_url TEXT,
  session_id TEXT,
  converted BOOLEAN NOT NULL DEFAULT false,
  order_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on affiliate_clicks
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate_clicks
CREATE POLICY "Affiliates can view their own clicks" 
ON public.affiliate_clicks 
FOR SELECT 
USING (auth.uid() = affiliate_id);

CREATE POLICY "Admins can view all clicks" 
ON public.affiliate_clicks 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

CREATE POLICY "System can insert clicks" 
ON public.affiliate_clicks 
FOR INSERT 
WITH CHECK (true);

-- Create affiliate payouts table
CREATE TABLE public.affiliate_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  affiliate_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payout_method TEXT NOT NULL DEFAULT 'manual',
  payout_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on affiliate_payouts
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;

-- Create policies for affiliate_payouts
CREATE POLICY "Affiliates can view their own payouts" 
ON public.affiliate_payouts 
FOR SELECT 
USING (auth.uid() = affiliate_id);

CREATE POLICY "Affiliates can request payouts" 
ON public.affiliate_payouts 
FOR INSERT 
WITH CHECK (auth.uid() = affiliate_id);

CREATE POLICY "Admins can manage all payouts" 
ON public.affiliate_payouts 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Update affiliate_commissions table to add more tracking fields
ALTER TABLE public.affiliate_commissions 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS paid_out BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS payout_id UUID;

-- Add policies for affiliate commissions insertion
CREATE POLICY "System can insert commissions" 
ON public.affiliate_commissions 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_affiliate_payouts_updated_at
BEFORE UPDATE ON public.affiliate_payouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to calculate affiliate balance
CREATE OR REPLACE FUNCTION public.get_affiliate_balance(affiliate_user_id UUID)
RETURNS TABLE(
  total_earned NUMERIC,
  total_pending NUMERIC,
  total_approved NUMERIC,
  total_paid NUMERIC,
  available_balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(commission_amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'approved' AND NOT paid_out THEN commission_amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN paid_out THEN commission_amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN status = 'approved' AND NOT paid_out THEN commission_amount ELSE 0 END), 0) as available_balance
  FROM public.affiliate_commissions 
  WHERE affiliate_id = affiliate_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;