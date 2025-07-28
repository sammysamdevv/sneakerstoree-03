import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const { message } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    const systemPrompt = `You are a helpful customer support agent for "Sneaker Store", an online sneaker retail business in Kenya. 

STORE INFORMATION:
- We sell authentic sneakers including Nike, Jordans, men's, women's, and unisex shoes
- We deliver throughout Kenya (1-3 days in Nairobi, 2-5 days elsewhere)
- We accept M-Pesa payments with STK push during checkout
- Price range: KSh 2,000 to KSh 15,000
- We offer 7-day returns for unworn items in original packaging
- We have an affiliate program with 10% commission - users can sign up for an account and enable affiliate status in their dashboard
- Contact: WhatsApp +254754280123

FEATURES YOU CAN HELP WITH:
- Product browsing and categories
- Order placement and tracking
- Shipping and delivery information
- Payment methods (M-Pesa)
- Returns and exchanges
- Size guides and availability
- Affiliate program information
- Account management

TONE: Be friendly, helpful, and professional. Keep responses concise but informative. Always try to guide customers toward making a purchase or solving their issue.

If asked about technical issues or things outside your scope, politely redirect them to contact support directly.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { text: `Customer message: ${message}` }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 500,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Gemini API error:', errorData);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chatbot function:', error);
    return new Response(JSON.stringify({ 
      error: 'Sorry, I\'m having trouble responding right now. Please try again or contact support via WhatsApp at +254754280123.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});