import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response('Server configuration error', { status: 500 });
    }

    if (!twilioSid || !twilioToken) {
      return new Response('Twilio not configured', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { to, from, body, message_id, tenant_id } = await req.json();
    
    if (!to || !from || !body || !message_id || !tenant_id) {
      return new Response('Missing required parameters', { status: 400 });
    }

    console.log('📱 Sending manual SMS:', { to, from, body: body.substring(0, 50) + '...' });

    // Send SMS via Twilio
    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: body,
        StatusCallback: `${supabaseUrl}/functions/v1/twilio-status-webhook`,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error(`❌ Twilio SMS sending failed: ${twilioError}`);
      
      // Update message status to failed
      await supabase
        .from('messages')
        .update({ status: 'failed', error_code: 'twilio_error' })
        .eq('id', message_id);
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send SMS via Twilio' 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const twilioData = await twilioResponse.json();
    console.log(`✅ Manual SMS sent via Twilio. SID: ${twilioData.sid}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        twilio_sid: twilioData.sid,
        message: 'Manual SMS sent successfully' 
      }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('❗ Error in send-manual-sms function:', err);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Unexpected server error' 
      }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});