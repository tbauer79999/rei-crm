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
   const { to, from, body, message_id, tenant_id, user_id } = await req.json();

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
      
        // Log failed manual SMS attempt
  try {
    const { data: messageData } = await supabase
      .from('messages')
      .select('lead_id')
      .eq('id', message_id)
      .single();

    if (messageData?.lead_id) {
      const { data: failActivityId, error: failActivityError } = await supabase
        .rpc('insert_sales_activity_with_followup', {
          p_tenant_id: tenant_id,
          p_lead_id: messageData.lead_id,
          p_activity_type: 'manual_sms_failed',
          p_outcome: 'failed',
          p_notes: `Manual SMS failed: ${twilioError}`,
          p_phone_number_used: from,
          p_activity_source: 'send_manual_sms',
          p_metadata: {
            error_message: twilioError,
            recipient_phone: to,
            message_length: body.length,
            failure_reason: 'twilio_delivery_failed',
            created_by: user_id || null
          }
        });

      if (failActivityError) {
        console.error('❌ Error logging failed SMS activity:', failActivityError);
      }
    }
  } catch (activityLoggingError) {
    console.error('❌ Error in failure activity logging:', activityLoggingError);
  }
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
try {
  // Get lead_id from the message
  const { data: messageData } = await supabase
    .from('messages')
    .select('lead_id')
    .eq('id', message_id)
    .single();

  if (messageData?.lead_id) {
    const { data: activityId, error: activityError } = await supabase
      .rpc('insert_sales_activity_with_followup', {
        p_tenant_id: tenant_id,
        p_lead_id: messageData.lead_id,
        p_activity_type: 'manual_sms',
        p_outcome: 'sent',
        p_notes: `Manual SMS sent by sales rep`,
        p_phone_number_used: from,
        p_activity_source: 'send_manual_sms',
        p_metadata: {
          twilio_sid: twilioData.sid,
          message_length: body.length,
          recipient_phone: to,
          manual_override: true,
          delivery_method: 'manual_sms_function',
          created_by: user_id || null
        }
      });

    if (activityError) {
      console.error('❌ Error logging manual SMS activity:', activityError);
    } else {
      console.log('✅ Manual SMS activity logged successfully');
    }
  }
} catch (activityLoggingError) {
  console.error('❌ Error in activity logging:', activityLoggingError);
  // Don't fail the main request if activity logging fails
}
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