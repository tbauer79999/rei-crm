import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Helper function to inject lead data into template (same as your instructionBuilder.js)
const generateLeadDetailsBlock = (lead: any = {}, fieldConfig: any[] = []) => {
  if (!lead || !fieldConfig.length) return '';

  // Standard lead table columns that might be in field config
  const standardFields = ['name', 'phone', 'email', 'status', 'campaign', 'created_at', 'last_contacted', 'notes', 'assigned_to'];
  
  // Remove duplicates by field_name first
  const uniqueFields = fieldConfig.filter((field: any, index: number, self: any[]) => 
    index === self.findIndex((f: any) => f.field_name === field.field_name)
  );

  // Check if lead has custom_fields and if it's an object
  const customFields = lead.custom_fields || {};
  
  const lines = uniqueFields
    .map((f: any) => {
      let val;
      
      // Check if this is a standard field or custom field
      if (standardFields.includes(f.field_name)) {
        // Access standard field directly from lead object
        val = lead[f.field_name];
      } else {
        // Access custom field from custom_fields JSONB column
        val = customFields[f.field_name];
      }
      
      // Skip if value is undefined, null, or empty string
      if (val === undefined || val === null || val === '') return null;
      
      return `- ${f.field_label || f.field_name}: ${val}`;
    })
    .filter(Boolean);

  if (!lines.length) return '';

  return `\n=== LEAD DETAILS ===\n${lines.join('\n')}\n`;
};

const injectLeadDataIntoTemplate = (template: string, lead: any = {}, fieldConfig: any[] = []) => {
  const leadDetailsBlock = generateLeadDetailsBlock(lead, fieldConfig);
  return template.replace('{{LEAD_DETAILS_PLACEHOLDER}}', leadDetailsBlock);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { tenant_id, lead_id, campaign_id } = await req.json();

    // Validate required parameters
    if (!lead_id || !tenant_id || !campaign_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id, lead_id, and campaign_id are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🤖 Starting AI outreach for lead ${lead_id} in campaign ${campaign_id}`);

    // 1. Initialize conversation if it doesn't exist
    const initConversationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/initialize-conversation`;
    
    try {
      await fetch(initConversationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          lead_id,
          tenant_id
        }),
      });
    } catch (initError) {
      console.error(`❌ Error initializing conversation for lead ${lead_id}:`, initError);
    }

    // 2. Get lead details
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", lead_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (leadError || !lead) {
      console.error("❌ Error fetching lead:", leadError);
      return new Response(
        JSON.stringify({ error: "Lead not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 3. Get campaign details for AI context
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaign_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (campaignError || !campaign) {
      console.error("❌ Error fetching campaign:", campaignError);
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 4. Get tenant's Twilio phone number
    const { data: phoneNumber, error: phoneError } = await supabase
      .from("phone_numbers")
      .select("phone_number, twilio_sid")
      .eq("tenant_id", tenant_id)
      .eq("status", "active")
      .single();

    if (phoneError || !phoneNumber) {
      console.error("❌ Error fetching phone number:", phoneError);
      return new Response(
        JSON.stringify({ error: "No active phone number found for tenant" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 5. ✅ GET GENERIC AI INSTRUCTION TEMPLATE
    const { data: aiInstructions, error: aiError } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_instruction_initial")
      .eq("tenant_id", tenant_id)
      .single();

    // 6. ✅ GET FIELD CONFIGURATION FOR THIS TENANT
    const { data: fieldConfig, error: fieldError } = await supabase
      .from("lead_field_config")
      .select("field_name, field_label")
      .eq("tenant_id", tenant_id);

    if (fieldError) {
      console.error("❌ Error fetching field config:", fieldError);
    }

    // 7. ✅ INJECT THIS LEAD'S DATA INTO THE GENERIC TEMPLATE
    const genericTemplate = aiInstructions?.value || "You are a helpful sales assistant.";
    const personalizedInstructions = injectLeadDataIntoTemplate(
      genericTemplate,
      lead,
      fieldConfig || []
    );

    console.log(`📋 Personalized instructions for ${lead.name}:`, personalizedInstructions);

    // 8. Generate AI message using OpenAI with personalized instructions
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const aiPrompt = `${personalizedInstructions}

Campaign: ${campaign.name}
Campaign Description: ${campaign.description || ""}

Generate a personalized initial outreach message for this lead based on the instructions above.`;

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant that generates personalized sales outreach messages."
          },
          {
            role: "user",
            content: aiPrompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const aiMessage = openaiData.choices[0]?.message?.content?.trim();

    if (!aiMessage) {
      throw new Error("Failed to generate AI message");
    }

    console.log(`📝 Generated AI message: ${aiMessage}`);

    // 9. Send SMS via Twilio
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

    if (!twilioSid || !twilioToken) {
      throw new Error("Twilio credentials not configured");
    }

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: phoneNumber.phone_number,
        To: lead.phone,
        Body: aiMessage,
      }),
    });

    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      throw new Error(`Twilio error: ${twilioError}`);
    }

    const twilioData = await twilioResponse.json();
    console.log(`📤 SMS sent successfully. Twilio SID: ${twilioData.sid}`);

    // 10. Log message in database
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        tenant_id,
        lead_id,
        message_id: twilioData.sid,
        direction: "outbound",
        message_body: aiMessage,
        sender: phoneNumber.phone_number,
        channel: "sms",
        timestamp: new Date().toISOString(),
        phone: lead.phone,
      });

    if (messageError) {
      console.error("❌ Error logging message:", messageError);
    }

    // 11. Update lead's last_contacted timestamp
    await supabase
      .from("leads")
      .update({ 
        last_contacted: new Date().toISOString(),
        last_message_at: new Date().toISOString()
      })
      .eq("id", lead_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "AI outreach sent successfully",
        twilio_sid: twilioData.sid,
        ai_message: aiMessage,
        personalized_instructions: personalizedInstructions // For debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error("❗ Unexpected error in ai-initial-outreach:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});