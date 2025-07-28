import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PayoutCompletionRequest {
  payout_id: string
  processed_by: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { payout_id, processed_by }: PayoutCompletionRequest = await req.json()

    console.log('Processing payout completion:', { payout_id, processed_by })

    // Get the payout details
    const { data: payout, error: payoutError } = await supabase
      .from('affiliate_payouts')
      .select('id, affiliate_id, amount, status')
      .eq('id', payout_id)
      .maybeSingle()

    if (payoutError) {
      console.error('Error fetching payout:', payoutError)
      throw payoutError
    }

    if (!payout) {
      console.log('Payout not found for ID:', payout_id)
      throw new Error('Payout not found')
    }

    if (payout.status !== 'pending') {
      console.log('Payout is not pending, skipping processing')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Payout is not pending',
          payout_status: payout.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log('Processing payout:', payout)

    // Update payout status to completed
    const { error: updatePayoutError } = await supabase
      .from('affiliate_payouts')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        processed_by: processed_by
      })
      .eq('id', payout_id)

    if (updatePayoutError) {
      console.error('Error updating payout status:', updatePayoutError)
      throw updatePayoutError
    }

    console.log('Payout status updated to completed')

    // Get approved commissions for this affiliate
    const { data: commissions, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select('id, commission_amount')
      .eq('affiliate_id', payout.affiliate_id)
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (commissionsError) {
      console.error('Error fetching commissions:', commissionsError)
      throw commissionsError
    }

    console.log('Found available commissions:', commissions?.length || 0)

    // Calculate exact deductions to match the payout amount
    let remainingAmount = payout.amount
    const deductionInserts = []
    let totalDeducted = 0
    
    for (const commission of commissions || []) {
      if (remainingAmount <= 0) break
      
      if (!commission || !commission.id || !commission.commission_amount) {
        console.log('Skipping invalid commission:', commission)
        continue
      }
      
      // Get existing deductions for this commission
      const { data: existingDeductions, error: deductionError } = await supabase
        .from('commission_deductions')
        .select('deducted_amount')
        .eq('commission_id', commission.id)
      
      if (deductionError) {
        console.error('Error fetching existing deductions:', deductionError)
        continue
      }
      
      const totalAlreadyDeducted = existingDeductions?.reduce((sum, d) => sum + Number(d.deducted_amount || 0), 0) || 0
      const remainingCommission = Number(commission.commission_amount || 0) - totalAlreadyDeducted
      
      if (remainingCommission > 0) {
        const deductionAmount = Math.min(remainingCommission, remainingAmount)
        
        deductionInserts.push({
          commission_id: commission.id,
          payout_id: payout_id,
          deducted_amount: deductionAmount
        })
        
        totalDeducted += deductionAmount
        remainingAmount -= deductionAmount
      }
    }

    console.log('Deductions to create:', {
      deduction_count: deductionInserts.length,
      total_deducted: totalDeducted,
      remaining_amount: remainingAmount
    })

    // Insert the exact deductions
    if (deductionInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('commission_deductions')
        .insert(deductionInserts)

      if (insertError) {
        console.error('Error creating deductions:', insertError)
        throw insertError
      }

      console.log('Successfully created commission deductions')
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        payout_id: payout_id,
        affiliate_id: payout?.affiliate_id || 'unknown',
        amount_processed: payout?.amount || 0,
        deductions_created: deductionInserts?.length || 0,
        total_deducted: totalDeducted || 0,
        message: 'Payout completed with exact amount deducted'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error processing payout completion:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})