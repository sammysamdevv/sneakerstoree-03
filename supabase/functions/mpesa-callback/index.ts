Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));

    // Extract callback data
    const { Body } = body;
    if (!Body || !Body.stkCallback) {
      console.log('Invalid callback format');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const { stkCallback } = Body;
    const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

    console.log(`Callback for CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`);

    // Import Supabase client
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.1');
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (ResultCode === 0) {
      // Extract M-Pesa receipt number from callback metadata
      const callbackMetadata = stkCallback.CallbackMetadata;
      let mpesaReceiptNumber = null;
      
      if (callbackMetadata && callbackMetadata.Item) {
        const receiptItem = callbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
        mpesaReceiptNumber = receiptItem ? receiptItem.Value : null;
      }

      console.log('M-Pesa Receipt Number:', mpesaReceiptNumber);

      // Payment successful - find the order using checkout request ID
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('checkout_request_id', CheckoutRequestID)
        .eq('status', 'pending')
        .single();

      if (orderError || !order) {
        console.log('Order not found for CheckoutRequestID:', CheckoutRequestID, orderError);
        return new Response('OK', { status: 200, headers: corsHeaders });
      }

      // Update order status to waiting shipment and store M-Pesa receipt
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status: 'waiting_shipment',
          mpesa_receipt_number: mpesaReceiptNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (updateError) {
        console.error('Failed to update order status:', updateError);
      } else {
        console.log(`Order ${order.id} status updated to waiting_shipment`);
      }

      // If there's an affiliate commission, approve it automatically
      if (order.affiliate_id && order.commission_amount > 0) {
        const { error: commissionError } = await supabase
          .from('affiliate_commissions')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString(),
            approved_by: null // System approval
          })
          .eq('order_id', order.id);

        if (commissionError) {
          console.error('Failed to approve commission:', commissionError);
        } else {
          console.log(`Commission approved for order ${order.id}`);
        }
      }

    } else {
      // Payment failed
      console.log(`Payment failed for CheckoutRequestID: ${CheckoutRequestID}, Reason: ${ResultDesc}`);
      
      // Optionally update order status to 'payment_failed'
      // We'll keep it as pending for manual review for now
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing M-Pesa callback:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
