-- Clear all user transactional data for fresh start
-- This will remove all commission history, orders, referrals, and reset balances

-- Delete commission deductions first (references affiliate_commissions)
DELETE FROM public.commission_deductions;

-- Delete affiliate payouts
DELETE FROM public.affiliate_payouts;

-- Delete affiliate commissions
DELETE FROM public.affiliate_commissions;

-- Delete affiliate clicks (referral tracking)
DELETE FROM public.affiliate_clicks;

-- Delete order items first (references orders)
DELETE FROM public.order_items;

-- Delete orders
DELETE FROM public.orders;

-- Reset affiliate-related fields in profiles
UPDATE public.profiles 
SET 
  total_commission = 0,
  affiliate_code = NULL,
  is_affiliate = false;

-- Reset admin status (optional - comment out if you want to keep admin users)
-- UPDATE public.profiles SET is_admin = false;

-- Note: This preserves user accounts and profile information but clears all transactional data