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
    const { amount, phone, reference } = await req.json();

    // Validate input
    if (!amount || !phone || !reference) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, phone, reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format phone number for M-Pesa (remove + and leading zeros, ensure starts with 254)
    let formattedPhone = phone.replace(/\+/g, '').replace(/^0/, '254');
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // M-Pesa API credentials - only Consumer Key and Secret required for sandbox
    const consumerKey = Deno.env.get('MPESA_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('MPESA_CONSUMER_SECRET');
    
    // Sandbox defaults
    const shortcode = '174379'; // M-Pesa sandbox test shortcode
    const passkey = 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919'; // M-Pesa sandbox passkey
    const callbackUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`; // Use your Supabase function URL

    if (!consumerKey || !consumerSecret) {
      console.log('M-Pesa credentials not configured, returning mock response');
      
      // Return mock success response for development
      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push initiated successfully (Mock)',
          checkoutRequestId: 'mock-checkout-' + Date.now(),
          amount: amount,
          phone: formattedPhone,
          reference: reference
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    const tokenResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Generate timestamp and password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = btoa(`${shortcode}${passkey}${timestamp}`);

    // Initiate STK Push
    const stkResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: reference,
        TransactionDesc: `Payment for Sneaker Store Order ${reference}`,
      }),
    });

    const stkData = await stkResponse.json();

    if (stkData.ResponseCode === '0') {
      // Store the checkout request ID mapping for callback tracking
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.1');
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Update order with checkout request ID for tracking
      await supabase
        .from('orders')
        .update({ 
          checkout_request_id: stkData.CheckoutRequestID || `mock-checkout-${Date.now()}`
        })
        .eq('id', reference);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'STK Push initiated successfully',
          checkoutRequestId: stkData.CheckoutRequestID,
          amount: amount,
          phone: formattedPhone,
          reference: reference
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'Failed to initiate STK Push',
          details: stkData
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in M-Pesa STK Push:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});