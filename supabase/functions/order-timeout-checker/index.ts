import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting order timeout check...')

    // Calculate the cutoff time (1 minute ago)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()

    // Find orders that are awaiting payment but were created more than 1 minute ago
    const { data: expiredOrders, error: fetchError } = await supabase
      .from('orders')
      .select('id, checkout_request_id, created_at, customer_name')
      .eq('status', 'awaiting_payment')
      .not('checkout_request_id', 'is', null) // Only orders that had STK push sent
      .lt('created_at', oneMinuteAgo)

    if (fetchError) {
      console.error('Error fetching expired orders:', fetchError)
      throw fetchError
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      console.log('No expired orders found')
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired orders found',
          checkedAt: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log(`Found ${expiredOrders.length} expired orders`)

    // Update expired orders to failed status
    const orderIds = expiredOrders.map(order => order.id)
    
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'payment_failed',
        updated_at: new Date().toISOString()
      })
      .in('id', orderIds)

    if (updateError) {
      console.error('Error updating expired orders:', updateError)
      throw updateError
    }

    // Update any related affiliate commissions
    const { error: commissionError } = await supabase
      .from('affiliate_commissions')
      .update({
        status: 'rejected',
        rejection_reason: 'Customer stopped at checkout and order was not completed',
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .in('order_id', orderIds)

    if (commissionError) {
      console.error('Error updating affiliate commissions:', commissionError)
    } else {
      console.log(`Updated affiliate commissions for ${orderIds.length} failed orders`)
    }

    // Log the updated orders for audit purposes
    for (const order of expiredOrders) {
      console.log(`Order ${order.id} (${order.customer_name}) marked as payment_failed - STK push timeout`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Updated ${expiredOrders.length} expired orders to payment_failed status`,
        updatedOrders: expiredOrders.length,
        checkedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Order timeout check failed:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        checkedAt: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})
