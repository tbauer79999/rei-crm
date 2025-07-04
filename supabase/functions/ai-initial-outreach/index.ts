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

// Helper function to generate campaign strategy based on metadata
const getCampaignStrategy = (industry: string, metadata: any) => {
  if (industry === 'Staffing') {
    if (metadata.talk_track === 'recruiting_candidates' || metadata.talk_track === 'Recruiting Candidates (B2C)') {
      return "This campaign is focused on recruiting candidates for open roles. Messages should check for interest, qualifications, and timing.";
    }
    if (metadata.talk_track === 'acquiring_clients' || metadata.talk_track === 'Acquiring Clients (B2B)') {
      return "This campaign is focused on signing new business clients who need staffing help. Messaging should build credibility and invite a call.";
    }
  }

  if (industry === 'Home Services' && metadata.service_type) {
    return `This campaign is for ${metadata.service_type} services. Help the lead feel it's fast and easy to get a quote or inspection.`;
  }

  if (industry === 'Financial Services' && metadata.service_type) {
    return `This campaign is focused on ${metadata.service_type}. Messaging should build trust and offer a clear next step without pressure.`;
  }

  if (industry === 'Auto Sales' && metadata.vehicle_type) {
    return `This campaign targets ${metadata.vehicle_type} leads. Messages should be friendly, helpful, and guide them toward the lot or a quote.`;
  }

  if (industry === 'Mortgage Lending' && metadata.service_type) {
    return `This campaign is for ${metadata.service_type} mortgage leads. Be clear and approachable — help them take the next step easily.`;
  }

  return '';
};

// Helper function to clean AI response and remove unwanted prefixes
const cleanAIMessage = (message: string): string => {
  if (!message) return '';
  
  // Remove common prefixes that AI might add
  const prefixesToRemove = [
    'Initial message:',
    'initial message:',
    'Initial Message:',
    'INITIAL MESSAGE:',
    'Message:',
    'message:',
    'Text:',
    'text:',
    'SMS:',
    'sms:',
    'Response:',
    'response:'
  ];
  
  let cleanedMessage = message.trim();
  
  // Check if message starts with any of these prefixes
  for (const prefix of prefixesToRemove) {
    if (cleanedMessage.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanedMessage = cleanedMessage.substring(prefix.length).trim();
      break; // Remove only the first matching prefix
    }
  }
  
  return cleanedMessage;
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

    // 3. Get campaign details for AI context - INCLUDING METADATA
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, talk_track, service_type, vehicle_type")
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

    // Extract campaign metadata
    const campaignMetadata = {
      talk_track: campaign.talk_track,
      service_type: campaign.service_type,
      vehicle_type: campaign.vehicle_type
    };

    console.log(`📊 Campaign metadata:`, campaignMetadata);

    // 4. Get campaign's assigned phone number
    const { data: phoneNumber, error: phoneError } = await supabase
      .from("campaigns")
      .select(`
        phone_number_id,
        phone_numbers (
          phone_number,
          twilio_sid,
          status
        )
      `)
      .eq("id", campaign_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (phoneError || !phoneNumber || !phoneNumber.phone_numbers) {
      console.error("❌ Error fetching campaign phone number:", phoneError);
      return new Response(
        JSON.stringify({ error: "No phone number assigned to campaign" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extract the actual phone number
    const campaignPhoneNumber = phoneNumber.phone_numbers.phone_number;

    // 5. Get tenant's industry setting
    const { data: tenantSettings } = await supabase
      .from("tenants")
      .select("industry")
      .eq("id", tenant_id)
      .single();

    const tenantIndustry = tenantSettings?.industry || '';

    // 6. GET AI INSTRUCTION TEMPLATE
    const { data: aiInstructions, error: aiError } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "ai_instruction_initial")
      .eq("tenant_id", tenant_id)
      .single();

    // 7. GET FIELD CONFIGURATION FOR THIS TENANT
    const { data: fieldConfig, error: fieldError } = await supabase
      .from("lead_field_config")
      .select("field_name, field_label")
      .eq("tenant_id", tenant_id);

    if (fieldError) {
      console.error("❌ Error fetching field config:", fieldError);
    }

    // 8. INJECT LEAD DATA AND CAMPAIGN STRATEGY INTO TEMPLATE
    const genericTemplate = aiInstructions?.value || "You are a helpful sales assistant.";
    
    // First inject lead details
    let personalizedInstructions = injectLeadDataIntoTemplate(
      genericTemplate,
      lead,
      fieldConfig || []
    );

    // Generate campaign strategy based on metadata
    const campaignStrategy = getCampaignStrategy(tenantIndustry, campaignMetadata);
    
    // Add campaign strategy section if we have one
    if (campaignStrategy) {
      personalizedInstructions = personalizedInstructions.replace(
        '=== CAMPAIGN STRATEGY ===',
        `=== CAMPAIGN STRATEGY ===\n${campaignStrategy}`
      );
      
      // If the template doesn't have a campaign strategy section, add it
      if (!personalizedInstructions.includes('=== CAMPAIGN STRATEGY ===')) {
        personalizedInstructions += `\n\n=== CAMPAIGN STRATEGY ===\n${campaignStrategy}`;
      }
    }

    console.log(`📋 Personalized instructions with campaign strategy for ${lead.name}:`, personalizedInstructions);

    // 9. Generate AI message using OpenAI with personalized instructions
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const aiPrompt = `${personalizedInstructions}

Campaign: ${campaign.name}
Campaign Description: ${campaign.description || ""}
${campaignStrategy ? `Campaign Strategy: ${campaignStrategy}` : ''}

Generate a personalized outreach message for this lead. Return ONLY the message text that should be sent to the customer - no labels, prefixes, or formatting.`;

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
            content: "You are an AI assistant that generates personalized sales outreach messages. Return ONLY the message text that should be sent to the customer. Do not include any labels, prefixes like 'Initial message:', or formatting. Just return the plain message text."
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
    let aiMessage = openaiData.choices[0]?.message?.content?.trim();

    if (!aiMessage) {
      throw new Error("Failed to generate AI message");
    }

    // Clean the AI message to remove any unwanted prefixes
    aiMessage = cleanAIMessage(aiMessage);

    console.log(`📝 Generated AI message: ${aiMessage}`);

    // 10. Send SMS via Twilio
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
        From: campaignPhoneNumber,
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

    // 11. Log message in database
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        tenant_id,
        lead_id,
        message_id: twilioData.sid,
        direction: "outbound",
        message_body: aiMessage,
        sender: campaignPhoneNumber,
        channel: "sms",
        timestamp: new Date().toISOString(),
        phone: lead.phone,
      });

    if (messageError) {
      console.error("❌ Error logging message:", messageError);
    }

    // 12. Update lead's last_contacted timestamp
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
        campaign_strategy: campaignStrategy,
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