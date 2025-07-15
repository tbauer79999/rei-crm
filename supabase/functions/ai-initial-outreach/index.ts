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

// Helper function to retrieve previous outbound messages for retry context
const getPreviousOutboundMessages = async (supabase: any, tenant_id: string, lead_id: string, limit: number = 3) => {
  const { data: previousMessages, error } = await supabase
    .from("messages")
    .select("message_body, status, inserted_at")
    .eq("tenant_id", tenant_id)
    .eq("lead_id", lead_id)
    .eq("direction", "outbound")
    .order("inserted_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("❌ Error fetching previous messages:", error);
    return [];
  }

  return previousMessages || [];
};

// Helper function to generate retry-specific prompt context
const generateRetryContext = (previousMessages: any[], isRetry: boolean) => {
  if (!isRetry || !previousMessages.length) {
    return '';
  }

  const messageHistory = previousMessages
    .map((msg, index) => `Previous attempt ${index + 1}: "${msg.message_body}" (Status: ${msg.status})`)
    .join('\n');

  return `\n=== RETRY CONTEXT ===
This is a retry attempt. Previous outreach attempts for this lead:
${messageHistory}

IMPORTANT: Generate a completely different message approach. Avoid repeating the same content, tone, or structure from previous attempts. Try a different angle, value proposition, or call-to-action.
`;
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
    const { 
      tenant_id, 
      lead_id, 
      campaign_id, 
      is_retry = false, 
      original_message_id = null 
    } = await req.json();

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

    console.log(`🤖 Starting AI outreach for lead ${lead_id} in campaign ${campaign_id} (retry: ${is_retry})`);

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

    // ===== A/B TESTING INTEGRATION =====
console.log(`🧪 Checking for active A/B tests for campaign ${campaign_id}...`);

// Check if lead is already assigned to an experiment
let experimentAssignment = null;
const { data: existingAssignment } = await supabase
  .from('experiment_results')
  .select(`
    experiment_id,
    variant_id,
    experiment_variants!inner(variant_name, configuration),
    experiments!inner(test_type, status)
  `)
  .eq('lead_id', lead_id)
  .eq('experiments.status', 'active')
  .maybeSingle();

if (existingAssignment) {
  experimentAssignment = existingAssignment;
  console.log(`✅ Lead already assigned to experiment ${existingAssignment.experiment_id}, variant ${existingAssignment.experiment_variants.variant_name}`);
} else {
  // Check for active experiments for this campaign
  const { data: activeExperiment } = await supabase
    .from('experiments')
    .select(`
      id, 
      traffic_split,
      test_type,
      experiment_variants (id, variant_name, configuration)
    `)
    .eq('campaign_id', campaign_id)
    .eq('status', 'active')
    .eq('tenant_id', tenant_id)
    .maybeSingle();

  if (activeExperiment) {
    console.log(`🧪 Found active experiment: ${activeExperiment.id} (${activeExperiment.test_type})`);
    
    // Assign lead to variant based on traffic split
    const random = Math.random() * 100;
    const variantA = activeExperiment.experiment_variants.find(v => v.variant_name === 'A');
    const variantB = activeExperiment.experiment_variants.find(v => v.variant_name === 'B');
    
    const selectedVariant = random < activeExperiment.traffic_split ? variantA : variantB;

    // Record the assignment
    const { error: assignError } = await supabase
      .from('experiment_results')
      .insert({
        experiment_id: activeExperiment.id,
        variant_id: selectedVariant.id,
        lead_id: lead_id,
        tenant_id: tenant_id,
        metric_value: 0, // Will be updated when outcome occurs
        assigned_at: new Date()
      });

    if (!assignError) {
      experimentAssignment = {
        experiment_id: activeExperiment.id,
        variant_id: selectedVariant.id,
        experiment_variants: selectedVariant,
        experiments: { test_type: activeExperiment.test_type, status: 'active' }
      };
      
      console.log(`✅ Lead ${lead_id} assigned to experiment ${activeExperiment.id}, variant ${selectedVariant.variant_name}`);
    } else {
      console.error('❌ Error assigning lead to experiment:', assignError);
    }
  } else {
    console.log(`ℹ️ No active experiments found for campaign ${campaign_id}`);
  }
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

    // 8. GET PREVIOUS OUTBOUND MESSAGES FOR RETRY CONTEXT
    let previousMessages: any[] = [];
    let retryContext = '';
    
    if (is_retry) {
      console.log(`🔄 Retry detected - fetching previous outbound messages for context`);
      previousMessages = await getPreviousOutboundMessages(supabase, tenant_id, lead_id, 3);
      retryContext = generateRetryContext(previousMessages, is_retry);
      console.log(`📋 Found ${previousMessages.length} previous messages for retry context`);
    }

    // 9. INJECT LEAD DATA AND CAMPAIGN STRATEGY INTO TEMPLATE
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

   // Add retry context if this is a retry attempt
   if (retryContext) {
     personalizedInstructions += retryContext;
   }

   // ===== APPLY VARIANT CONFIGURATION =====
   // Apply A/B test variant configuration if lead is in an experiment
   if (experimentAssignment) {
     const variantConfig = experimentAssignment.experiment_variants.configuration;
     const testType = experimentAssignment.experiments.test_type;
     const variantName = experimentAssignment.experiment_variants.variant_name;
     
     console.log(`🧪 Applying variant ${variantName} configuration for ${testType} test:`, variantConfig);
     
     // Apply different modifications based on test type
     switch (testType) {
       case 'opening':
         if (variantConfig.config && variantName === 'B') {
           // Replace opening message template with variant B config
           personalizedInstructions += `\n\n=== MESSAGE TEMPLATE OVERRIDE ===\nIMPORTANT: Use this specific opening message template: "${variantConfig.config}"\nThis overrides any other message templates.\n`;
         }
         break;
         
       case 'tone':
         if (variantConfig.config && variantName === 'B') {
           // Modify AI tone instructions
           personalizedInstructions += `\n\n=== TONE OVERRIDE ===\nIMPORTANT: Use a ${variantConfig.config} tone throughout your message. This overrides any other tone instructions.\n`;
         }
         break;
         
       case 'sequence':
         if (variantConfig.config && variantName === 'B') {
           // Modify message sequence/structure
           personalizedInstructions += `\n\n=== MESSAGE STRUCTURE OVERRIDE ===\nUse this message structure: ${variantConfig.config}\n`;
         }
         break;
         
       case 'timing':
         // Timing tests don't affect initial message generation
         console.log(`ℹ️ Timing test detected - no message modification needed for initial outreach`);
         break;
         
       default:
         console.log(`⚠️ Unknown test type: ${testType}`);
     }
     
     console.log(`✅ Variant ${variantName} configuration applied to AI instructions`);
   }

   console.log(`📋 Personalized instructions ${is_retry ? 'with retry context' : ''} for ${lead.name}:`, personalizedInstructions);

   // 10. Generate AI message using OpenAI with personalized instructions
   const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
   if (!openaiApiKey) {
     throw new Error("OpenAI API key not configured");
   }

   // Adjust system prompt for retry scenarios
   const systemPrompt = is_retry 
     ? "You are an AI assistant that generates personalized sales outreach messages. This is a RETRY attempt - the previous messages failed to deliver or get a response. Generate a completely different approach with fresh content, different tone, and new angle. Avoid repeating any content from previous attempts. Return ONLY the message text that should be sent to the customer. Do not include any labels, prefixes like 'Initial message:', or formatting. Just return the plain message text."
     : "You are an AI assistant that generates personalized sales outreach messages. Return ONLY the message text that should be sent to the customer. Do not include any labels, prefixes like 'Initial message:', or formatting. Just return the plain message text.";

   // Add A/B testing context to the prompt
   const abTestContext = experimentAssignment 
     ? `\n\n=== A/B TEST CONTEXT ===\nThis lead is part of experiment ${experimentAssignment.experiment_id}, variant ${experimentAssignment.experiment_variants.variant_name}. Follow the variant configuration above exactly.\n`
     : '';

   const aiPrompt = `${personalizedInstructions}

Campaign: ${campaign.name}
Campaign Description: ${campaign.description || ""}
${campaignStrategy ? `Campaign Strategy: ${campaignStrategy}` : ''}
${abTestContext}

${is_retry ? 'RETRY ATTEMPT: ' : ''}Generate a personalized outreach message for this lead. Return ONLY the message text that should be sent to the customer - no labels, prefixes, or formatting.`;

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
           content: systemPrompt
         },
         {
           role: "user",
           content: aiPrompt
         }
       ],
       max_tokens: 150,
       temperature: is_retry ? 0.9 : 0.7, // Higher temperature for retries to encourage variety
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

   console.log(`📝 Generated AI message ${is_retry ? '(retry)' : ''}: ${aiMessage}`);

   // 11. Send SMS via Twilio
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

   // 12. Log message in database with retry tracking
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
       original_message_id: is_retry ? original_message_id : null,
       retry_eligible: false, // New retry messages shouldn't be eligible for retry themselves
       retry_reason: is_retry ? 'blocked' : null,
       status: 'pending', // Will be updated by delivery status webhook
       queued: true
     });

   if (messageError) {
     console.error("❌ Error logging message:", messageError);
   }

   // 13. Update lead's last_contacted timestamp
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
       message: `AI outreach sent successfully${is_retry ? ' (retry attempt)' : ''}`,
       twilio_sid: twilioData.sid,
       ai_message: aiMessage,
       campaign_strategy: campaignStrategy,
       is_retry: is_retry,
       previous_attempts: previousMessages.length,
       original_message_id: is_retry ? original_message_id : null,
       experiment_assignment: experimentAssignment ? {
         experiment_id: experimentAssignment.experiment_id,
         variant: experimentAssignment.experiment_variants.variant_name,
         test_type: experimentAssignment.experiments.test_type
       } : null,
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