-- Fix security warning by setting search_path for the function
DROP FUNCTION IF EXISTS public.get_affiliate_balance(UUID);

CREATE OR REPLACE FUNCTION public.get_affiliate_balance(affiliate_user_id UUID)
RETURNS TABLE(
  total_earned NUMERIC,
  total_pending NUMERIC,
  total_approved NUMERIC,
  total_paid NUMERIC,
  available_balance NUMERIC
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;