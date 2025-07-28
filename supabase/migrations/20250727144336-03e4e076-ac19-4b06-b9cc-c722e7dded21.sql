-- Fix the get_affiliate_balance function to properly handle multiple deductions per commission
CREATE OR REPLACE FUNCTION public.get_affiliate_balance(affiliate_user_id uuid)
RETURNS TABLE(total_earned numeric, total_pending numeric, total_approved numeric, total_paid numeric, available_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH commission_summary AS (
    SELECT 
      ac.id,
      ac.commission_amount,
      ac.status,
      COALESCE(SUM(cd.deducted_amount), 0) as total_deducted_per_commission
    FROM public.affiliate_commissions ac
    LEFT JOIN public.commission_deductions cd ON ac.id = cd.commission_id
    WHERE ac.affiliate_id = affiliate_user_id
    GROUP BY ac.id, ac.commission_amount, ac.status
  )
  SELECT 
    COALESCE(SUM(cs.commission_amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN cs.status = 'pending' THEN cs.commission_amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN cs.status = 'approved' THEN cs.commission_amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(cs.total_deducted_per_commission), 0) as total_paid,
    COALESCE(SUM(CASE WHEN cs.status = 'approved' THEN cs.commission_amount - cs.total_deducted_per_commission ELSE 0 END), 0) as available_balance
  FROM commission_summary cs;
END;
$function$;