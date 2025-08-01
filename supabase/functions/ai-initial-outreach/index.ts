import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Helper function to inject lead data into template (same as your instructionBuilder.js)
const generateLeadDetailsBlock = (lead = {}, fieldConfig = [])=>{
  if (!lead || !fieldConfig.length) return '';
  // Standard lead table columns that might be in field config
  const standardFields = [
    'name',
    'phone',
    'email',
    'status',
    'campaign',
    'created_at',
    'last_contacted',
    'notes',
    'assigned_to'
  ];
  // Remove duplicates by field_name first
  const uniqueFields = fieldConfig.filter((field, index, self)=>index === self.findIndex((f)=>f.field_name === field.field_name));
  // Check if lead has custom_fields and if it's an object
  const customFields = lead.custom_fields || {};
  const lines = uniqueFields.map((f)=>{
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
  }).filter(Boolean);
  if (!lines.length) return '';
  return `\n=== LEAD DETAILS ===\n${lines.join('\n')}\n`;
};

const injectLeadDataIntoTemplate = (template, lead = {}, fieldConfig = [])=>{
  const leadDetailsBlock = generateLeadDetailsBlock(lead, fieldConfig);
  return template.replace('{{LEAD_DETAILS_PLACEHOLDER}}', leadDetailsBlock);
};

// Helper function to generate campaign strategy based on metadata
const getCampaignStrategy = (industry, metadata)=>{
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
const cleanAIMessage = (message)=>{
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
  for (const prefix of prefixesToRemove){
    if (cleanedMessage.toLowerCase().startsWith(prefix.toLowerCase())) {
      cleanedMessage = cleanedMessage.substring(prefix.length).trim();
      break; // Remove only the first matching prefix
    }
  }
  return cleanedMessage;
};

// Helper function to retrieve previous outbound messages for retry context
const getPreviousOutboundMessages = async (supabase, tenant_id, lead_id, limit = 3)=>{
  const { data: previousMessages, error } = await supabase.from("messages").select("message_body, status, inserted_at").eq("tenant_id", tenant_id).eq("lead_id", lead_id).eq("direction", "outbound").order("inserted_at", {
    ascending: false
  }).limit(limit);
  if (error) {
    console.error("❌ Error fetching previous messages:", error);
    return [];
  }
  return previousMessages || [];
};

// Helper function to generate retry-specific prompt context
const generateRetryContext = (previousMessages, isRetry)=>{
  if (!isRetry || !previousMessages.length) {
    return '';
  }
  const messageHistory = previousMessages.map((msg, index)=>`Previous attempt ${index + 1}: "${msg.message_body}" (Status: ${msg.status})`).join('\n');
  return `\n=== RETRY CONTEXT ===
This is a retry attempt. Previous outreach attempts for this lead:
${messageHistory}


IMPORTANT: Generate a completely different message approach. Avoid repeating the same content, tone, or structure from previous attempts. Try a different angle, value proposition, or call-to-action.
`;
};

// ✅ NEW: TCPA Compliance Helper Function
const shouldAddTcpaText = async (supabase, tenant_id, lead_id) => {
  try {
    // Get TCPA settings
    const { data: tcpaSettings } = await supabase
      .from('platform_settings')
      .select('key, value')
      .eq('tenant_id', tenant_id)
      .in('key', ['tcpa_compliance_enabled', 'tcpa_frequency_mode', 'tcpa_frequency_value', 'tcpa_custom_text']);

    const settingsMap = tcpaSettings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) || {};
    
    const tcpaEnabled = settingsMap.tcpa_compliance_enabled === 'true';
    if (!tcpaEnabled) {
      console.log('📋 TCPA compliance disabled');
      return { shouldAdd: false };
    }

    const frequencyMode = settingsMap.tcpa_frequency_mode || 'initial';
    const frequencyValue = parseInt(settingsMap.tcpa_frequency_value || '5');
    const customText = settingsMap.tcpa_custom_text || '';

    console.log(`📋 TCPA settings: mode=${frequencyMode}, value=${frequencyValue}, enabled=${tcpaEnabled}`);

    // Get message count for this lead
    const { data: messageCount } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('lead_id', lead_id)
      .eq('direction', 'outbound');

    const totalOutboundMessages = messageCount?.length || 0;

    let shouldAdd = false;
    
    switch (frequencyMode) {
      case 'initial':
        shouldAdd = totalOutboundMessages === 0; // Only first message
        break;
      case 'every':
        shouldAdd = true; // Every message
        break;
      case 'count':
        shouldAdd = (totalOutboundMessages + 1) % frequencyValue === 1; // Every X messages
        break;
      case 'days':
        // Check last TCPA message date
        const { data: lastTcpaMessage } = await supabase
          .from('messages')
          .select('timestamp')
          .eq('lead_id', lead_id)
          .eq('direction', 'outbound')
          .ilike('message_body', '%stop%')
          .order('timestamp', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!lastTcpaMessage) {
          shouldAdd = true; // No TCPA message yet
        } else {
          const daysSinceLastTcpa = (Date.now() - new Date(lastTcpaMessage.timestamp).getTime()) / (24 * 60 * 60 * 1000);
          shouldAdd = daysSinceLastTcpa >= frequencyValue;
        }
        break;
    }

    const tcpaText = customText || "Reply STOP to opt out of future messages. Msg & data rates may apply.";
    
    console.log(`📋 TCPA decision: shouldAdd=${shouldAdd}, mode=${frequencyMode}, messageCount=${totalOutboundMessages}`);
    
    return { shouldAdd, tcpaText, frequencyMode };
  } catch (error) {
    console.error('❌ Error checking TCPA compliance:', error);
    return { shouldAdd: false };
  }
};

serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders
    });
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const { tenant_id, lead_id, campaign_id, is_retry = false, original_message_id = null } = await req.json();
    // Validate required parameters
    if (!lead_id || !tenant_id || !campaign_id) {
      return new Response(JSON.stringify({
        error: "tenant_id, lead_id, and campaign_id are required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`🤖 Starting AI outreach for lead ${lead_id} in campaign ${campaign_id} (retry: ${is_retry})`);
    // 1. Initialize conversation if it doesn't exist
    const initConversationUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/initialize-conversation`;
    try {
      await fetch(initConversationUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
        },
        body: JSON.stringify({
          lead_id,
          tenant_id
        })
      });
    } catch (initError) {
      console.error(`❌ Error initializing conversation for lead ${lead_id}:`, initError);
    }
    // 2. Get lead details
    const { data: lead, error: leadError } = await supabase.from("leads").select("*").eq("id", lead_id).eq("tenant_id", tenant_id).single();
    if (leadError || !lead) {
      console.error("❌ Error fetching lead:", leadError);
      return new Response(JSON.stringify({
        error: "Lead not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // ===== A/B TESTING INTEGRATION =====
    console.log(`🧪 Checking for active A/B tests for campaign ${campaign_id}...`);
    // Check if lead is already assigned to an experiment
    let experimentAssignment = null;
    const { data: existingAssignment } = await supabase.from('experiment_results').select(`
    experiment_id,
    variant_id,
    experiment_variants!inner(variant_name, configuration),
    experiments!inner(test_type, status)
  `).eq('lead_id', lead_id).eq('experiments.status', 'active').maybeSingle();
    if (existingAssignment) {
      experimentAssignment = existingAssignment;
      console.log(`✅ Lead already assigned to experiment ${existingAssignment.experiment_id}, variant ${existingAssignment.experiment_variants.variant_name}`);
    } else {
      // Check for active experiments for this campaign
      const { data: activeExperiment } = await supabase.from('experiments').select(`
      id, 
      traffic_split,
      test_type,
      experiment_variants (id, variant_name, configuration)
    `).eq('campaign_id', campaign_id).eq('status', 'active').eq('tenant_id', tenant_id).maybeSingle();
      if (activeExperiment) {
        console.log(`🧪 Found active experiment: ${activeExperiment.id} (${activeExperiment.test_type})`);
        // Assign lead to variant based on traffic split
        const random = Math.random() * 100;
        const variantA = activeExperiment.experiment_variants.find((v)=>v.variant_name === 'A');
        const variantB = activeExperiment.experiment_variants.find((v)=>v.variant_name === 'B');
        const selectedVariant = random < activeExperiment.traffic_split ? variantA : variantB;
        // Record the assignment
        const { error: assignError } = await supabase.from('experiment_results').insert({
          experiment_id: activeExperiment.id,
          variant_id: selectedVariant.id,
          lead_id: lead_id,
          tenant_id: tenant_id,
          metric_value: 0,
          assigned_at: new Date()
        });
        if (!assignError) {
          experimentAssignment = {
            experiment_id: activeExperiment.id,
            variant_id: selectedVariant.id,
            experiment_variants: selectedVariant,
            experiments: {
              test_type: activeExperiment.test_type,
              status: 'active'
            }
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
    const { data: campaign, error: campaignError } = await supabase.from("campaigns").select("*, talk_track, service_type, vehicle_type").eq("id", campaign_id).eq("tenant_id", tenant_id).single();
    if (campaignError || !campaign) {
      console.error("❌ Error fetching campaign:", campaignError);
      return new Response(JSON.stringify({
        error: "Campaign not found"
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Extract campaign metadata
    const campaignMetadata = {
      talk_track: campaign.talk_track,
      service_type: campaign.service_type,
      vehicle_type: campaign.vehicle_type
    };
    console.log(`📊 Campaign metadata:`, campaignMetadata);
    // 4. Get campaign's assigned phone number
    const { data: phoneNumber, error: phoneError } = await supabase.from("campaigns").select(`
        phone_number_id,
        phone_numbers (
          phone_number,
          twilio_sid,
          status
        )
      `).eq("id", campaign_id).eq("tenant_id", tenant_id).single();
    if (phoneError || !phoneNumber || !phoneNumber.phone_numbers) {
      console.error("❌ Error fetching campaign phone number:", phoneError);
      return new Response(JSON.stringify({
        error: "No phone number assigned to campaign"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
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
    const { data: aiInstructions, error: aiError } = await supabase.from("platform_settings").select("value").eq("key", "ai_instruction_initial").eq("tenant_id", tenant_id).single();
// 7. GET FIELD CONFIGURATION FOR THIS TENANT
let fieldConfig = [];
if (tenantSettings?.industry_id) {
  const { data: fetchedConfig, error: fieldError } = await supabase
    .from("industry_field_templates")
    .select("field_name, field_label")
    .eq("industry_id", tenantSettings.industry_id);
  
  if (fieldError) {
    console.error("❌ Error fetching field config:", fieldError);
  } else {
    fieldConfig = fetchedConfig || [];
  }
}
    // 8. GET PREVIOUS OUTBOUND MESSAGES FOR RETRY CONTEXT
let previousMessages = [];
let retryContext = '';
if (is_retry) {
  console.log(`🔄 Retry detected - fetching previous outbound messages for context`);
  previousMessages = await getPreviousOutboundMessages(supabase, tenant_id, lead_id, 3);
  retryContext = generateRetryContext(previousMessages, is_retry);
  console.log(`📋 Found ${previousMessages.length} previous messages for retry context`);
}

// 8.5. CHECK FOR INITIAL MESSAGE TEMPLATES
console.log(`📝 Checking for initial message templates for tenant ${tenant_id}...`);
const { data: templates, error: templatesError } = await supabase
  .from('smstemplates')
  .select('message')
  .eq('tenant_id', tenant_id)
  .not('message', 'is', null)
  .neq('message', '');

let finalMessage = null;
let usedTemplate = false;

if (!templatesError && templates && templates.length > 0) {
  console.log(`✅ Found ${templates.length} templates - using template approach`);
  
  // Randomly select a template
  const randomIndex = Math.floor(Math.random() * templates.length);
  const selectedTemplate = templates[randomIndex];
  
  console.log(`🎲 Selected template ${randomIndex + 1}/${templates.length}: "${selectedTemplate.message.substring(0, 50)}..."`);
  
  // Apply placeholders to the template
  finalMessage = selectedTemplate.message
    .replace(/{firstName}/g, lead.name?.split(' ')[0] || '')
    .replace(/{lastName}/g, lead.name?.split(' ').slice(1).join(' ') || '')
    .replace(/{companyName}/g, lead.custom_fields?.company || lead.custom_fields?.companyName || '')
    .replace(/{address}/g, lead.custom_fields?.address || lead.custom_fields?.property_address || '')
    .replace(/{phoneNumber}/g, lead.phone || '')
    .replace(/{email}/g, lead.email || '');
  
  // Clean up any remaining empty placeholders
  finalMessage = finalMessage.replace(/\s+/g, ' ').trim();
  
  usedTemplate = true;
  console.log(`📝 Template processed with placeholders: "${finalMessage}"`);
  
  // Update template usage counter
  await supabase
    .from('smstemplates')
    .update({ used: (selectedTemplate.used || 0) + 1 })
    .eq('tenant_id', tenant_id)
    .eq('message', selectedTemplate.message);
} else {
  console.log(`ℹ️ No templates found - using AI generation`);
}

// 9. INJECT LEAD DATA AND CAMPAIGN STRATEGY INTO TEMPLATE (only if no template)
    const genericTemplate = aiInstructions?.value || "You are a helpful sales assistant.";
    // First inject lead details
    let personalizedInstructions = injectLeadDataIntoTemplate(genericTemplate, lead, fieldConfig || []);
    // Generate campaign strategy based on metadata
    const campaignStrategy = getCampaignStrategy(tenantIndustry, campaignMetadata);
    // Add campaign strategy section if we have one
    if (campaignStrategy) {
      personalizedInstructions = personalizedInstructions.replace('=== CAMPAIGN STRATEGY ===', `=== CAMPAIGN STRATEGY ===\n${campaignStrategy}`);
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
      switch(testType){
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
    // Skip AI generation if we have a template
if (usedTemplate) {
  console.log(`📝 Using template message, skipping AI generation`);
} else {
  console.log(`📋 Personalized instructions ${is_retry ? 'with retry context' : ''} for ${lead.name}:`, personalizedInstructions);
}

// 10. Generate AI message using OpenAI with personalized instructions (only if no template)
let aiMessage;

if (usedTemplate) {
  aiMessage = finalMessage;
  console.log(`📝 Using template message: ${aiMessage}`);
} else {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }
    // Adjust system prompt for retry scenarios
    const systemPrompt = is_retry ? "You are an AI assistant that generates personalized sales outreach messages. This is a RETRY attempt - the previous messages failed to deliver or get a response. Generate a completely different approach with fresh content, different tone, and new angle. Avoid repeating any content from previous attempts. Return ONLY the message text that should be sent to the customer. Do not include any labels, prefixes like 'Initial message:', or formatting. Just return the plain message text." : "You are an AI assistant that generates personalized sales outreach messages. Return ONLY the message text that should be sent to the customer. Do not include any labels, prefixes like 'Initial message:', or formatting. Just return the plain message text.";
    // Add A/B testing context to the prompt
    const abTestContext = experimentAssignment ? `\n\n=== A/B TEST CONTEXT ===\nThis lead is part of experiment ${experimentAssignment.experiment_id}, variant ${experimentAssignment.experiment_variants.variant_name}. Follow the variant configuration above exactly.\n` : '';
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
        "Content-Type": "application/json"
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
        temperature: is_retry ? 0.9 : 0.7
      })
    });
    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }
    const openaiData = await openaiResponse.json();
    aiMessage = openaiData.choices[0]?.message?.content?.trim();
    if (!aiMessage) {
      throw new Error("Failed to generate AI message");
    }
    // Clean the AI message to remove any unwanted prefixes
    aiMessage = cleanAIMessage(aiMessage);
    console.log(`📝 Generated AI message ${is_retry ? '(retry)' : ''}: ${aiMessage}`);
}

    // ✅ NEW: Check TCPA compliance before sending
    console.log('📋 Checking TCPA compliance for initial outreach message...');
    const tcpaCheck = await shouldAddTcpaText(supabase, tenant_id, lead_id);
    let finalAiMessage = aiMessage;

    if (tcpaCheck.shouldAdd) {
      finalAiMessage = `${aiMessage}\n\n${tcpaCheck.tcpaText}`;
      console.log(`✅ TCPA text added to initial outreach (${tcpaCheck.frequencyMode} mode): "${tcpaCheck.tcpaText}"`);
    } else {
      console.log(`ℹ️ TCPA text not required for this initial outreach message`);
    }

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
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: campaignPhoneNumber,
        To: lead.phone,
        Body: finalAiMessage  // ✅ UPDATED: Using TCPA-compliant message
      })
    });
    if (!twilioResponse.ok) {
      const twilioError = await twilioResponse.text();
      console.error(`❌ Twilio SMS sending failed: ${twilioError}`);
      // Don't retry if this was already a retry attempt (prevent infinite loops)
      if (is_retry) {
        console.error(`❌ Retry attempt also failed. Stopping retry chain.`);
        throw new Error(`Twilio error on retry: ${twilioError}`);
      }
      console.log(`🔄 Logging failed message and triggering immediate retry...`);
      // Log the failed original message
      const { data: failedMessage, error: logError } = await supabase.from("messages").insert({
        tenant_id,
        lead_id,
        message_id: `failed_${Date.now()}`,
        direction: "outbound",
        message_body: finalAiMessage,  // ✅ UPDATED: Store TCPA-compliant message
        sender: campaignPhoneNumber,
        channel: "sms",
        timestamp: new Date().toISOString(),
        phone: lead.phone,
        status: 'failed',
        retry_eligible: true,
        retry_count: 0,
        error_code: twilioResponse.status,
        retry_reason: 'twilio_api_failure'
      }).select().single();
      if (logError) {
        console.error("❌ Error logging failed message:", logError);
      }
      // Immediate retry by calling this same function recursively
      console.log(`🔄 Triggering immediate retry with different AI message...`);
      try {
        const retryResponse = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-initial-outreach`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
          },
          body: JSON.stringify({
            tenant_id,
            lead_id,
            campaign_id,
            is_retry: true,
            original_message_id: failedMessage?.id || null
          })
        });
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          console.log(`✅ Immediate retry successful: ${retryData.twilio_sid}`);
          return new Response(JSON.stringify({
            success: true,
            message: "Original message failed, but retry succeeded",
            original_error: twilioError,
            retry_result: retryData,
            failed_message_id: failedMessage?.id
          }), {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } else {
          const retryError = await retryResponse.text();
          console.error(`❌ Immediate retry also failed: ${retryError}`);
          throw new Error(`Both original and retry attempts failed. Original: ${twilioError}, Retry: ${retryError}`);
        }
      } catch (retryError) {
        console.error(`❌ Error during immediate retry:`, retryError);
        throw new Error(`Original failed (${twilioError}), retry failed (${retryError.message})`);
      }
    }
    const twilioData = await twilioResponse.json();
    console.log(`📤 SMS sent successfully. Twilio SID: ${twilioData.sid}`);
    // 12. Log message in database with retry tracking
    const { error: messageError } = await supabase.from("messages").insert({
      tenant_id,
      lead_id,
      message_id: twilioData.sid,
      direction: "outbound",
      message_body: finalAiMessage,  // ✅ UPDATED: Store TCPA-compliant message
      sender: campaignPhoneNumber,
      channel: "sms",
      timestamp: new Date().toISOString(),
      phone: lead.phone,
      original_message_id: is_retry ? original_message_id : null,
      retry_eligible: false,
      retry_reason: is_retry ? 'blocked' : null,
      status: 'pending',
      queued: true
    });
    if (messageError) {
      console.error("❌ Error logging message:", messageError);
    }

// 12.1. Log sales activity for analytics
const { data: salesMember } = await supabase
  .from('sales_team')
  .select('user_profile_id')
  .eq('tenant_id', tenant_id)
  .eq('is_available', true)
  .limit(1)
  .single();

const { data: activityData, error: activityError } = await supabase
  .from('sales_activities')
  .insert({
    tenant_id: tenant_id,
    lead_id: lead_id,
    activity_type: 'sms',
    outcome: 'sent',
    notes: `${usedTemplate ? 'Template' : 'AI'} initial outreach sent${is_retry ? ' (retry attempt)' : ''}`,
    phone_number_used: campaignPhoneNumber,
    activity_source: 'ai_initial_outreach',
    created_by: salesMember?.user_profile_id,
    metadata: {
      twilio_sid: twilioData.sid,
      used_template: usedTemplate,
      available_templates: templates?.length || 0,
      message_length: finalAiMessage.length,
      campaign_id,
      is_retry,
      previous_attempts: previousMessages.length,
      original_message_id: is_retry ? original_message_id : null,
      experiment_assignment: experimentAssignment ? {
        experiment_id: experimentAssignment.experiment_id,
        variant: experimentAssignment.experiment_variants.variant_name,
        test_type: experimentAssignment.experiments.test_type
      } : null,
      tcpa_compliance: {
        enabled: tcpaCheck.shouldAdd,
        mode: tcpaCheck.frequencyMode || 'disabled',
        text_added: tcpaCheck.shouldAdd
      },
      ai_generated: !usedTemplate,
      template_generated: usedTemplate
    }
  });

if (activityError) {
  console.error('❌ Error logging sales activity:', activityError);
}


    // 13. Update lead's last_contacted timestamp
    await supabase.from("leads").update({
      last_contacted: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    }).eq("id", lead_id);
    return new Response(JSON.stringify({
  success: true,
  message: `${usedTemplate ? 'Template' : 'AI'} outreach sent successfully${is_retry ? ' (retry attempt)' : ''}`,
  twilio_sid: twilioData.sid,
  ai_message: finalAiMessage,  // ✅ UPDATED: Return TCPA-compliant message
  used_template: usedTemplate,
  available_templates: templates?.length || 0,
  campaign_strategy: campaignStrategy,
  is_retry: is_retry,
  previous_attempts: previousMessages.length,
  original_message_id: is_retry ? original_message_id : null,
  experiment_assignment: experimentAssignment ? {
    experiment_id: experimentAssignment.experiment_id,
    variant: experimentAssignment.experiment_variants.variant_name,
    test_type: experimentAssignment.experiments.test_type
  } : null,
  tcpa_compliance: {
    enabled: tcpaCheck.shouldAdd,
    mode: tcpaCheck.frequencyMode || 'disabled',
    text_added: tcpaCheck.shouldAdd
  },
  personalized_instructions: usedTemplate ? 'Template used' : personalizedInstructions
}), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (err) {
    console.error("❗ Unexpected error in ai-initial-outreach:", err);
    return new Response(JSON.stringify({
      error: err.message || "Internal Server Error"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});