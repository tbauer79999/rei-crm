// supabase/functions/handleincomingmessage/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📥 Inbound webhook received from Twilio')

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response(`<Response><Message>Server configuration error</Message></Response>`, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('❌ Error parsing form data:', formError);
      return new Response(`<Response><Message>Invalid request format</Message></Response>`, {
        status: 400,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const fromTwilio = formData.get('From')?.toString() || '';
    const to = formData.get('To')?.toString() || '';
    const bodyText = formData.get('Body')?.toString() || '';
    const twilioMessageSid = formData.get('MessageSid')?.toString() || '';
    const timestamp = new Date().toISOString();

    if (!fromTwilio || !bodyText) {
      console.error('❌ Missing required Twilio parameters');
      return new Response(`<Response><Message>Missing required message data</Message></Response>`, {
        status: 400,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    // ✅ IMPROVED PHONE NUMBER NORMALIZATION
    let normalizedFromPhone = fromTwilio;
    
    // Remove all non-digits first
    const digitsOnly = fromTwilio.replace(/\D/g, '');
    console.log(`📞 Extracted digits: ${digitsOnly} from ${fromTwilio}`);

    // Handle different formats to match database format (+1-555-444-7777)
    if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      // US number with country code: 15554447777 -> +1-555-444-7777
      normalizedFromPhone = `+1-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
    } else if (digitsOnly.length === 10) {
      // US number without country code: 5554447777 -> +1-555-444-7777  
      normalizedFromPhone = `+1-${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
    } else {
      // Keep original format if it doesn't match expected patterns
      console.log(`⚠️ Unexpected phone format: ${fromTwilio}, keeping as-is`);
      normalizedFromPhone = fromTwilio;
    }

    console.log(`📞 Phone normalization: ${fromTwilio} -> ${normalizedFromPhone}`);

    console.log('Parsed form data:', { 
      fromTwilio, 
      normalizedFromPhone, 
      to, 
      bodyText: bodyText.substring(0, 100) + '...', 
      twilioMessageSid 
    });

    // Find the lead - try multiple phone formats to be safe
    console.log(`🔎 Searching for lead with normalized phone: ${normalizedFromPhone}`);
    
    // Try the normalized format first
    let { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, tenant_id, name, phone')
      .eq('phone', normalizedFromPhone)
      .maybeSingle();

    // If not found, try the original Twilio format
    if (!lead && !leadError) {
      console.log(`🔎 Trying original Twilio format: ${fromTwilio}`);
      const result = await supabase
        .from('leads')
        .select('id, tenant_id, name, phone')
        .eq('phone', fromTwilio)
        .maybeSingle();
      
      lead = result.data;
      leadError = result.error;
    }

    // If still not found, try without country code (just the 10 digits)
    if (!lead && !leadError && digitsOnly.length >= 10) {
      const tenDigits = digitsOnly.slice(-10); // Get last 10 digits
      console.log(`🔎 Trying 10-digit format: ${tenDigits}`);
      
      const result = await supabase
        .from('leads')
        .select('id, tenant_id, name, phone')
        .or(`phone.eq.${tenDigits},phone.like.%${tenDigits}`)
        .maybeSingle();
      
      lead = result.data;
      leadError = result.error;
    }

    if (leadError && leadError.code !== 'PGRST116') {
      console.error('❌ Database error fetching lead:', leadError);
      return new Response(`<Response><Message>Error finding your account. Please try again later.</Message></Response>`, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    if (!lead) {
      console.error('❌ No lead found for any phone format. Tried:', {
        normalized: normalizedFromPhone,
        original: fromTwilio,
        digits: digitsOnly
      });
      
      // Log all leads for debugging
      const { data: allLeads } = await supabase
        .from('leads')
        .select('phone')
        .limit(5);
      
      console.log('📋 Sample phone formats in database:', allLeads?.map(l => l.phone));
      
      return new Response(`<Response><Message>No lead found for this number. Please register first.</Message></Response>`, {
        status: 404,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    if (!lead.tenant_id) {
      console.error('❌ Lead found but invalid data:', lead);
      return new Response(`<Response><Message>Account data incomplete. Please contact support.</Message></Response>`, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const tenant_id = lead.tenant_id;
    const lead_id = lead.id;
    const sender_name = lead.name || normalizedFromPhone;

    console.log(`✅ Found lead: tenant_id=${tenant_id}, lead_id=${lead_id}, sender=${sender_name}, stored_phone=${lead.phone}`);

    // Insert message
    const { data: insertedMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        direction: 'inbound',
        message_body: bodyText,
        timestamp,
        phone: fromTwilio, // Store original Twilio format
        tenant_id,
        lead_id,
        message_id: twilioMessageSid,
        sender: sender_name,
        channel: 'sms',
      })
      .select('id');

      if (!insertError) {
  console.log(`📊 Triggering lead scoring for ${lead_id}`);
  await fetch("https://wuuqrdlfgkasnwydyvgk.supabase.co/functions/v1/score-lead", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    },
    body: JSON.stringify({ lead_id })
  });
}


    if (insertError || !insertedMessage || insertedMessage.length === 0) {
      console.error('❌ Failed to insert message:', insertError);
      return new Response(`<Response><Message>Error saving message. Please try again.</Message></Response>`, {
        status: 500,
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const insertedId = insertedMessage[0].id;

    console.log('✅ Message inserted with ID:', insertedId);
    console.log('✅ Calling processmessageai with payload:', { message_id: insertedId, tenant_id });

    // Trigger AI processing
    try {
      const aiResponse = await fetch(`${supabaseUrl}/functions/v1/processmessageai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ message_id: insertedId, tenant_id })
      });

      if (!aiResponse.ok) {
        console.error('❌ AI processing failed:', aiResponse.status, aiResponse.statusText);
        const errorText = await aiResponse.text();
        console.error('❌ AI processing error details:', errorText);
      } else {
        console.log('✅ AI processing triggered successfully');
      }
    } catch (aiError) {
      console.error('❌ Error calling AI processing:', aiError);
      // Don't fail the main request if AI processing fails
    }

    return new Response('<Response/>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' }
    });

  } catch (err) {
    console.error('❗ Unexpected error in handleincomingmessage:', err);
    return new Response(`<Response><Message>Server error occurred. Please try again.</Message></Response>`, {
      status: 500,
      headers: { 'Content-Type': 'text/xml' }
    });
  }
});