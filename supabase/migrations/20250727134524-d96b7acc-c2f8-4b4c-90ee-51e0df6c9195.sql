-- Fix unlinked payouts by marking the remaining commission as paid out
-- Link the remaining commission to one of the unlinked payouts
UPDATE affiliate_commissions 
SET paid_out = true, 
    payout_id = 'a62dc46f-2afd-4070-821e-5670c9bbf144'
WHERE id = '93f80dc5-18ae-4a29-ad07-0ed57f1438a4' 
  AND affiliate_id = '36988d40-8e34-4355-96f5-0a14627e8715'
  AND paid_out = false;