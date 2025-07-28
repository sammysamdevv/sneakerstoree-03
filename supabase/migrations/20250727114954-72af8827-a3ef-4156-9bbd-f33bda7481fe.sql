-- Update RLS policy to allow users to create commissions during checkout
DROP POLICY IF EXISTS "System can insert commissions" ON affiliate_commissions;

-- Allow authenticated users to create commissions
CREATE POLICY "Authenticated users can create commissions" 
ON affiliate_commissions 
FOR INSERT 
WITH CHECK (true);

-- Create commissions for existing orders that have affiliate_id but no commission record
INSERT INTO affiliate_commissions (affiliate_id, order_id, commission_amount, status)
SELECT 
  o.affiliate_id,
  o.id,
  o.commission_amount,
  CASE 
    WHEN o.status IN ('delivered', 'confirmed') THEN 'approved'
    ELSE 'pending'
  END as status
FROM orders o
WHERE o.affiliate_id IS NOT NULL 
  AND o.commission_amount > 0
  AND NOT EXISTS (
    SELECT 1 FROM affiliate_commissions ac 
    WHERE ac.order_id = o.id
  );