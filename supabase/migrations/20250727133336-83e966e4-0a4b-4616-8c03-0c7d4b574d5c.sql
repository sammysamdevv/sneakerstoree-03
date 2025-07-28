-- Update the get_affiliate_balance function to properly handle paid out commissions
CREATE OR REPLACE FUNCTION public.get_affiliate_balance(affiliate_user_id uuid)
 RETURNS TABLE(total_earned numeric, total_pending numeric, total_approved numeric, total_paid numeric, available_balance numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(commission_amount), 0) as total_earned,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as total_pending,
    COALESCE(SUM(CASE WHEN status = 'approved' AND NOT paid_out THEN commission_amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN paid_out = true THEN commission_amount ELSE 0 END), 0) as total_paid,
    COALESCE(SUM(CASE WHEN status = 'approved' AND NOT paid_out THEN commission_amount ELSE 0 END), 0) as available_balance
  FROM public.affiliate_commissions 
  WHERE affiliate_id = affiliate_user_id;
END;
$function$