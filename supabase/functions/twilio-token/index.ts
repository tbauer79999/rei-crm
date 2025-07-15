import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      }
    })
  }

  try {
    console.log('📞 Twilio token function called');
    
    const body = await req.json();
    console.log('📦 Request body:', body);
    
    const { user_id, tenant_id } = body;

    // Simple response that works
    return new Response(
      JSON.stringify({
        accessToken: "mock-token-12345",
        identity: `user_${user_id}`,
        success: true
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }
})