-- Fix security warnings from functions by setting proper search_path

-- Update validate_commission_amount function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_commission_amount()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  order_total NUMERIC;
  affiliate_exists BOOLEAN;
BEGIN
  -- Validate commission amount is positive
  IF NEW.commission_amount <= 0 THEN
    RAISE EXCEPTION 'Commission amount must be positive';
  END IF;

  -- Get order total
  SELECT total_amount INTO order_total
  FROM public.orders
  WHERE id = NEW.order_id;

  IF order_total IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- Validate commission doesn't exceed 50% of order total (reasonable business rule)
  IF NEW.commission_amount > (order_total * 0.5) THEN
    RAISE EXCEPTION 'Commission amount cannot exceed 50%% of order total';
  END IF;

  -- Validate affiliate exists and is active
  SELECT EXISTS(
    SELECT 1 FROM public.profiles 
    WHERE id = NEW.affiliate_id 
    AND is_affiliate = true
  ) INTO affiliate_exists;

  IF NOT affiliate_exists THEN
    RAISE EXCEPTION 'Invalid or inactive affiliate';
  END IF;

  RETURN NEW;
END;
$$;

-- Update audit_financial_operation function with secure search_path
CREATE OR REPLACE FUNCTION public.audit_financial_operation()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
BEGIN
  -- Log commission operations
  IF TG_TABLE_NAME = 'affiliate_commissions' THEN
    INSERT INTO public.financial_audit_log (
      operation_type,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'commission_created'
        WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'commission_status_changed'
        ELSE 'commission_updated'
      END,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
      auth.uid()
    );
  END IF;

  -- Log payout operations
  IF TG_TABLE_NAME = 'affiliate_payouts' THEN
    INSERT INTO public.financial_audit_log (
      operation_type,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      CASE 
        WHEN TG_OP = 'INSERT' THEN 'payout_requested'
        WHEN TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN 'payout_status_changed'
        ELSE 'payout_updated'
      END,
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
      CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
      auth.uid()
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;