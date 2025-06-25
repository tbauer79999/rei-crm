import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    console.log("📤 Starting to process queued messages...");

    // Get all messages that are on business hours hold and ready to send
    const { data: queuedMessages, error: fetchError } = await supabase
      .from("messages")
      .select(`
        id,
        message_body,
        phone,
        tenant_id,
        lead_id,
        scheduled_response_time,
        leads!fk_messages_lead!inner(
          id,
          phone,
          name
        )
      `)
      .eq("business_hours_hold", true)
      .eq("direction", "outbound")
      .lte("scheduled_response_time", new Date().toISOString())
      .order("scheduled_response_time", { ascending: true });

    if (fetchError) {
      console.error("❌ Error fetching queued messages:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queued messages" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!queuedMessages || queuedMessages.length === 0) {
      console.log("✅ No queued messages to send");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No queued messages to process" 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${queuedMessages.length} queued messages to send`);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each queued message
    for (const message of queuedMessages) {
      try {
        console.log(`📱 Sending queued message ${message.id} to ${message.leads.phone}`);

        // Get tenant's Twilio phone number
// Get the lead's campaign to find the correct phone number
const { data: leadData, error: leadError } = await supabase
  .from("leads")
  .select("campaign_id")
  .eq("id", message.lead_id)
  .single();

if (leadError || !leadData || !leadData.campaign_id) {
  throw new Error(`Lead ${message.lead_id} has no campaign assigned`);
}

// Get campaign's assigned phone number
const { data: campaignPhone, error: phoneError } = await supabase
  .from("campaigns")
  .select(`
    phone_number_id,
    phone_numbers (
      phone_number,
      twilio_sid,
      status
    )
  `)
  .eq("id", leadData.campaign_id)
  .single();

if (phoneError || !campaignPhone || !campaignPhone.phone_numbers) {
  throw new Error(`No phone number assigned to campaign for lead ${message.lead_id}`);
}

const phoneNumber = campaignPhone.phone_numbers;

        // Send via Twilio
        const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

        if (!twilioSid || !twilioToken) {
          throw new Error("Twilio credentials not configured");
        }

        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: phoneNumber.phone_number,
              To: message.leads.phone,
              Body: message.message_body,
            }),
          }
        );

        if (!twilioResponse.ok) {
          const twilioError = await twilioResponse.text();
          throw new Error(`Twilio error: ${twilioError}`);
        }

        const twilioData = await twilioResponse.json();
        console.log(`✅ Message sent successfully. Twilio SID: ${twilioData.sid}`);

        // Update message status
        const { error: updateError } = await supabase
          .from("messages")
          .update({
            business_hours_hold: false,
            message_id: twilioData.sid,
            sent_at: new Date().toISOString()
          })
          .eq("id", message.id);

        if (updateError) {
          console.error(`⚠️ Message sent but failed to update status:`, updateError);
        }

        successCount++;

      } catch (messageError) {
        console.error(`❌ Failed to send message ${message.id}:`, messageError);
        errorCount++;
        errors.push({
          message_id: message.id,
          phone: message.leads.phone,
          error: messageError.message
        });
      }

      // Add small delay between messages to avoid rate limiting
      if (successCount < queuedMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`📊 Queued message processing complete: ${successCount} sent, ${errorCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Queued message processing complete",
        stats: {
          total: queuedMessages.length,
          sent: successCount,
          failed: errorCount
        },
        errors: errors.length > 0 ? errors : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error("❗ Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});