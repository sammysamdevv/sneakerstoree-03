-- Update the request_affiliate_payout function to check for pending payouts
CREATE OR REPLACE FUNCTION public.request_affiliate_payout(p_affiliate_id uuid, p_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_available_balance numeric;
  v_payout_id uuid;
  v_commission_record RECORD;
  v_remaining_amount numeric;
  v_updated_commissions json[] DEFAULT '{}';
  v_pending_payouts_count integer;
BEGIN
  -- Check if affiliate has any pending payouts
  SELECT COUNT(*) INTO v_pending_payouts_count
  FROM affiliate_payouts
  WHERE affiliate_id = p_affiliate_id 
    AND status = 'pending';
  
  IF v_pending_payouts_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You already have a pending payout request. Please wait for it to be processed before requesting another.'
    );
  END IF;
  
  -- Check available balance
  SELECT available_balance INTO v_available_balance
  FROM get_affiliate_balance(p_affiliate_id)
  LIMIT 1;
  
  IF v_available_balance IS NULL THEN
    v_available_balance := 0;
  END IF;
  
  -- Validate amount
  IF p_amount <= 0 OR p_amount > v_available_balance THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid amount or insufficient balance',
      'available_balance', v_available_balance
    );
  END IF;
  
  -- Create payout request
  INSERT INTO affiliate_payouts (affiliate_id, amount, payout_method, status)
  VALUES (p_affiliate_id, p_amount, 'manual', 'pending')
  RETURNING id INTO v_payout_id;
  
  -- Reserve commissions immediately
  v_remaining_amount := p_amount;
  
  FOR v_commission_record IN
    SELECT id, commission_amount
    FROM affiliate_commissions
    WHERE affiliate_id = p_affiliate_id
      AND status = 'approved'
      AND paid_out = false
    ORDER BY created_at ASC
  LOOP
    IF v_remaining_amount <= 0 THEN
      EXIT;
    END IF;
    
    IF v_remaining_amount >= v_commission_record.commission_amount THEN
      -- Mark entire commission as paid out
      UPDATE affiliate_commissions
      SET paid_out = true, payout_id = v_payout_id
      WHERE id = v_commission_record.id;
      
      v_remaining_amount := v_remaining_amount - v_commission_record.commission_amount;
      
      v_updated_commissions := v_updated_commissions || 
        json_build_object('id', v_commission_record.id, 'amount', v_commission_record.commission_amount);
    ELSE
      -- This shouldn't happen with our current logic, but handle it for completeness
      EXIT;
    END IF;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'payout_id', v_payout_id,
    'reserved_amount', p_amount - v_remaining_amount,
    'updated_commissions', v_updated_commissions
  );
END;
$function$