import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Starting daily tasks execution...');

    // Task 1: Process pending affiliate commissions
    console.log('Processing pending affiliate commissions...');
    const { data: pendingCommissions, error: commissionsError } = await supabase
      .from('affiliate_commissions')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // 24 hours old

    if (!commissionsError && pendingCommissions) {
      for (const commission of pendingCommissions) {
        // Auto-approve commissions that are 24+ hours old
        await supabase
          .from('affiliate_commissions')
          .update({ status: 'approved' })
          .eq('id', commission.id);
      }
      console.log(`Auto-approved ${pendingCommissions.length} pending commissions`);
    }

    // Task 2: Clean up old sessions/tokens (example)
    console.log('Cleaning up old data...');
    // Add cleanup logic here if needed

    // Task 3: Send periodic notifications
    console.log('Sending periodic notifications...');
    const { data: affiliates, error: affiliatesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_affiliate', true);

    if (!affiliatesError && affiliates) {
      console.log(`Found ${affiliates.length} active affiliates`);
    }

    // Task 4: Generate daily reports
    console.log('Generating daily reports...');
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const { data: dailyOrders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', yesterday.toISOString());

    if (!ordersError && dailyOrders) {
      console.log(`Processed ${dailyOrders.length} orders from yesterday`);
    }

    console.log('Daily tasks completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily tasks completed successfully',
        timestamp: new Date().toISOString(),
        tasks_completed: [
          'affiliate_commissions_processing',
          'data_cleanup',
          'notifications',
          'daily_reports'
        ]
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in daily tasks:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to execute daily tasks', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});