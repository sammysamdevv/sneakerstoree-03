-- Phase 2: Order and Commission Security Fixes

-- 1. Add proper policies for order_items table
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete order items for their orders" ON public.order_items;

-- Allow users to insert order items only for their own orders
CREATE POLICY "Users can insert order items for their orders" 
ON public.order_items 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_items.order_id 
    AND user_id = auth.uid()
  )
);

-- Allow users to update order items only for their pending orders
CREATE POLICY "Users can update order items for pending orders" 
ON public.order_items 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_items.order_id 
    AND user_id = auth.uid() 
    AND status = 'pending'
  )
);

-- Allow users to delete order items only for their pending orders
CREATE POLICY "Users can delete order items for pending orders" 
ON public.order_items 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_items.order_id 
    AND user_id = auth.uid() 
    AND status = 'pending'
  )
);

-- Admins can manage all order items
CREATE POLICY "Admins can manage all order items" 
ON public.order_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- 2. Update commission creation policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can create commissions" ON public.affiliate_commissions;

-- Only allow commission creation by admins or service role (edge functions)
CREATE POLICY "Restricted commission creation" 
ON public.affiliate_commissions 
FOR INSERT 
WITH CHECK (
  -- Allow admins
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
  OR
  -- Allow service role (edge functions) - this will be NULL for service role
  auth.uid() IS NULL
);

-- 3. Create audit trail table for financial operations
CREATE TABLE IF NOT EXISTS public.financial_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  operation_type TEXT NOT NULL, -- 'commission_created', 'commission_approved', 'payout_requested', etc.
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT
);

-- Enable RLS on audit log
ALTER TABLE public.financial_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.financial_audit_log 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- System can insert audit logs (for triggers)
CREATE POLICY "System can insert audit logs" 
ON public.financial_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 4. Create validation function for commission amounts
CREATE OR REPLACE FUNCTION public.validate_commission_amount()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Add validation trigger for commissions
CREATE TRIGGER validate_commission_trigger
  BEFORE INSERT OR UPDATE ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_commission_amount();

-- 5. Create audit triggers for financial operations
CREATE OR REPLACE FUNCTION public.audit_financial_operation()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers
CREATE TRIGGER audit_commissions_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.affiliate_commissions
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_financial_operation();

CREATE TRIGGER audit_payouts_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.affiliate_payouts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_financial_operation();

-- 6. Create index for better audit log performance
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_performed_at ON public.financial_audit_log(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_operation_type ON public.financial_audit_log(operation_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_log_record_id ON public.financial_audit_log(record_id);