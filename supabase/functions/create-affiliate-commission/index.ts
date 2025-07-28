import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateCommissionRequest {
  order_id: string;
  commission_rate?: number; // Optional, defaults to 10%
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { order_id, commission_rate = 0.1 } = await req.json() as CreateCommissionRequest;

    console.log('Processing commission creation for order:', order_id);

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order has affiliate_id
    if (!order.affiliate_id) {
      console.log('Order has no affiliate_id, skipping commission creation');
      return new Response(
        JSON.stringify({ message: 'Order has no affiliate, no commission needed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if commission already exists for this order
    const { data: existingCommission } = await supabase
      .from('affiliate_commissions')
      .select('id')
      .eq('order_id', order_id)
      .single();

    if (existingCommission) {
      console.log('Commission already exists for order:', order_id);
      return new Response(
        JSON.stringify({ message: 'Commission already exists for this order' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this customer has already purchased products through this affiliate before
    // Get all products in this order
    const { data: orderItems, error: orderItemsError } = await supabase
      .from('order_items')
      .select('product_id')
      .eq('order_id', order_id);

    if (orderItemsError) {
      console.error('Error fetching order items:', orderItemsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch order items' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if customer has previously purchased any of these products through this affiliate
    const productIds = orderItems.map(item => item.product_id);
    
    const { data: previousPurchases, error: previousPurchasesError } = await supabase
      .from('orders')
      .select(`
        id,
        order_items!inner(product_id)
      `)
      .eq('user_id', order.user_id)
      .eq('affiliate_id', order.affiliate_id)
      .neq('id', order_id)
      .in('order_items.product_id', productIds);

    if (previousPurchasesError) {
      console.error('Error checking previous purchases:', previousPurchasesError);
    } else if (previousPurchases && previousPurchases.length > 0) {
      console.log('Customer has already purchased products through this affiliate, no commission due');
      return new Response(
        JSON.stringify({ 
          message: 'Customer has already purchased these products through this affiliate. No commission due.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify affiliate exists
    const { data: affiliate, error: affiliateError } = await supabase
      .from('profiles')
      .select('id, is_affiliate, affiliate_code')
      .eq('id', order.affiliate_id)
      .eq('is_affiliate', true)
      .single();

    if (affiliateError || !affiliate) {
      console.error('Affiliate not found or not active:', affiliateError);
      return new Response(
        JSON.stringify({ error: 'Invalid affiliate' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate commission amount
    const commissionAmount = order.total_amount * commission_rate;

    // Create commission
    const { data: commission, error: commissionError } = await supabase
      .from('affiliate_commissions')
      .insert({
        affiliate_id: order.affiliate_id,
        order_id: order_id,
        commission_amount: commissionAmount,
        status: 'pending'
      })
      .select()
      .single();

    if (commissionError) {
      console.error('Error creating commission:', commissionError);
      return new Response(
        JSON.stringify({ error: 'Failed to create commission' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Commission created successfully:', commission);

    return new Response(
      JSON.stringify({
        message: 'Commission created successfully',
        commission: {
          id: commission.id,
          affiliate_id: commission.affiliate_id,
          order_id: commission.order_id,
          commission_amount: commission.commission_amount,
          status: commission.status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});