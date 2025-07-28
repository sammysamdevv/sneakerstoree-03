-- Create missing commissions for orders with affiliate_id but no existing commission
INSERT INTO public.affiliate_commissions (
  affiliate_id,
  order_id,
  commission_amount,
  status,
  created_at,
  updated_at
)
SELECT 
  o.affiliate_id,
  o.id as order_id,
  o.total_amount * 0.1 as commission_amount, -- 10% commission
  'pending' as status,
  o.created_at,
  now() as updated_at
FROM public.orders o
LEFT JOIN public.affiliate_commissions ac ON o.id = ac.order_id
WHERE o.affiliate_id IS NOT NULL 
  AND ac.order_id IS NULL;