import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessCommissionsRequest {
  action: 'create_missing' | 'approve_pending' | 'process_order';
  order_id?: string;
  commission_rate?: number;
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

    const { action, order_id, commission_rate = 0.1 } = await req.json() as ProcessCommissionsRequest;

    console.log('Processing commissions with action:', action, 'for order:', order_id);

    switch (action) {
      case 'create_missing': {
        // Create commissions for all orders with affiliate_id but no commission
        const { data: ordersWithoutCommissions, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            affiliate_id,
            total_amount,
            status,
            created_at
          `)
          .not('affiliate_id', 'is', null);

        if (ordersError) {
          throw ordersError;
        }

        const missingCommissions = [];
        
        for (const order of ordersWithoutCommissions) {
          // Check if commission exists
          const { data: existingCommission } = await supabase
            .from('affiliate_commissions')
            .select('id')
            .eq('order_id', order.id)
            .single();

          if (!existingCommission) {
            // Check if this customer has already purchased products through this affiliate before
            const { data: orderItems } = await supabase
              .from('order_items')
              .select('product_id')
              .eq('order_id', order.id);

            if (orderItems && orderItems.length > 0) {
              const productIds = orderItems.map(item => item.product_id);
              
              const { data: previousPurchases } = await supabase
                .from('orders')
                .select(`
                  id,
                  order_items!inner(product_id)
                `)
                .eq('user_id', order.user_id)
                .eq('affiliate_id', order.affiliate_id)
                .neq('id', order.id)
                .in('order_items.product_id', productIds);

              // Only create commission if customer hasn't purchased these products through this affiliate before
              if (!previousPurchases || previousPurchases.length === 0) {
                missingCommissions.push({
                  affiliate_id: order.affiliate_id,
                  order_id: order.id,
                  commission_amount: order.total_amount * commission_rate,
                  status: order.status === 'delivered' ? 'approved' : 'pending',
                  created_at: order.created_at,
                  approved_at: order.status === 'delivered' ? new Date().toISOString() : null
                });
              }
            }
          }
        }

        if (missingCommissions.length > 0) {
          const { error: insertError } = await supabase
            .from('affiliate_commissions')
            .insert(missingCommissions);

          if (insertError) {
            throw insertError;
          }
        }

        return new Response(
          JSON.stringify({
            message: `Created ${missingCommissions.length} missing commissions`,
            created_count: missingCommissions.length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'approve_pending': {
        // Approve all pending commissions for delivered orders
        const { data: updatedCommissions, error: updateError } = await supabase
          .from('affiliate_commissions')
          .update({ 
            status: 'approved',
            approved_at: new Date().toISOString()
          })
          .eq('status', 'pending')
          .in('order_id', 
            supabase
              .from('orders')
              .select('id')
              .eq('status', 'delivered')
          )
          .select();

        if (updateError) {
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            message: `Approved ${updatedCommissions?.length || 0} pending commissions`,
            approved_commissions: updatedCommissions
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'process_order': {
        if (!order_id) {
          return new Response(
            JSON.stringify({ error: 'order_id is required for process_order action' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get order details
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .select('*')
          .eq('id', order_id)
          .single();

        if (orderError || !order) {
          return new Response(
            JSON.stringify({ error: 'Order not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Skip if no affiliate
        if (!order.affiliate_id) {
          return new Response(
            JSON.stringify({ message: 'Order has no affiliate' }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if commission exists
        const { data: existingCommission, error: commissionError } = await supabase
          .from('affiliate_commissions')
          .select('*')
          .eq('order_id', order_id)
          .single();

        let result;

        if (existingCommission) {
          // Update existing commission based on order status
          if (order.status === 'delivered' && existingCommission.status === 'pending') {
            const { data: updatedCommission, error: updateError } = await supabase
              .from('affiliate_commissions')
              .update({
                status: 'approved',
                approved_at: new Date().toISOString()
              })
              .eq('id', existingCommission.id)
              .select()
              .single();

            if (updateError) {
              throw updateError;
            }

            // Update affiliate's total commission in profiles
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                total_commission: supabase.sql`COALESCE(total_commission, 0) + ${updatedCommission.commission_amount}`
              })
              .eq('id', order.affiliate_id);

            if (profileError) {
              console.error('Error updating affiliate profile:', profileError);
            }

            result = { action: 'approved', commission: updatedCommission };
          } else {
            result = { action: 'no_change', commission: existingCommission };
          }
        } else {
          // Check if this customer has already purchased products through this affiliate before
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id')
            .eq('order_id', order_id);

          if (orderItems && orderItems.length > 0) {
            const productIds = orderItems.map(item => item.product_id);
            
            const { data: previousPurchases } = await supabase
              .from('orders')
              .select(`
                id,
                order_items!inner(product_id)
              `)
              .eq('user_id', order.user_id)
              .eq('affiliate_id', order.affiliate_id)
              .neq('id', order_id)
              .in('order_items.product_id', productIds);

            if (previousPurchases && previousPurchases.length > 0) {
              return new Response(
                JSON.stringify({
                  message: 'Customer has already purchased these products through this affiliate. No commission due.',
                  result: { action: 'no_commission_due', commission: null }
                }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
          }

          // Create new commission
          const commissionAmount = order.total_amount * commission_rate;
          const commissionStatus = order.status === 'delivered' ? 'approved' : 'pending';

          const { data: newCommission, error: createError } = await supabase
            .from('affiliate_commissions')
            .insert({
              affiliate_id: order.affiliate_id,
              order_id: order_id,
              commission_amount: commissionAmount,
              status: commissionStatus,
              approved_at: commissionStatus === 'approved' ? new Date().toISOString() : null
            })
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          // Update affiliate's total commission in profiles if commission is approved
          if (commissionStatus === 'approved') {
            const { error: profileError } = await supabase
              .from('profiles')
              .update({
                total_commission: supabase.sql`COALESCE(total_commission, 0) + ${commissionAmount}`
              })
              .eq('id', order.affiliate_id);

            if (profileError) {
              console.error('Error updating affiliate profile:', profileError);
            }
          }

          result = { action: 'created', commission: newCommission };
        }

        return new Response(
          JSON.stringify({
            message: `Commission ${result.action} for order ${order_id}`,
            result
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});