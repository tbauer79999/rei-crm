import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// Helper function to inject lead data into template (same as ai-initial-outreach)
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
    const { tenant_id, lead_id, campaign_id, follow_up_stage } = await req.json();

    // Validate required parameters
    if (!lead_id || !tenant_id || !campaign_id || follow_up_stage === undefined) {
      return new Response(
        JSON.stringify({ error: "tenant_id, lead_id, campaign_id, and follow_up_stage are required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate follow_up_stage (should be 1, 2, or 3)
    if (![1, 2, 3].includes(follow_up_stage)) {
      return new Response(
        JSON.stringify({ error: "follow_up_stage must be 1, 2, or 3" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`🔄 Starting AI follow-up ${follow_up_stage} for lead ${lead_id} in campaign ${campaign_id}`);

    // 1. Get lead details
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

    // 2. Verify lead is in correct follow-up stage
    const expectedStage = follow_up_stage - 1; // If sending follow-up 1, current stage should be 0
    if (lead.follow_up_stage !== expectedStage) {
      console.error(`❌ Lead follow_up_stage mismatch. Expected ${expectedStage}, got ${lead.follow_up_stage}`);
      return new Response(
        JSON.stringify({ error: `Lead is not ready for follow-up stage ${follow_up_stage}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ✅ NEW: Check if this lead has ever responded
    const { data: messageHistory } = await supabase
      .from("messages")
      .select("direction")
      .eq("lead_id", lead_id)
      .eq("direction", "inbound");

    const hasEverResponded = messageHistory && messageHistory.length > 0;
    console.log(`📊 Lead engagement history: ${hasEverResponded ? `${messageHistory.length} responses` : 'Never responded'}`);

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

    // 4. Get campaign's assigned phone number
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
      .eq("id", campaign_id)
      .eq("tenant_id", tenant_id)
      .single();

    if (phoneError || !campaignPhone || !campaignPhone.phone_numbers) {
      console.error("❌ Error fetching campaign phone number:", phoneError);
      return new Response(
        JSON.stringify({ error: "No phone number assigned to campaign" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const phoneNumber = campaignPhone.phone_numbers;

    // 5. Get follow-up AI instruction template
    const instructionKey = `ai_instruction_followup_${follow_up_stage}`;
    const { data: aiInstructions, error: aiError } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", instructionKey)
      .eq("tenant_id", tenant_id)
      .single();

    if (aiError || !aiInstructions?.value) {
      console.error(`❌ Error fetching AI instructions for ${instructionKey}:`, aiError);
      return new Response(
        JSON.stringify({ error: `Follow-up instruction template not configured: ${instructionKey}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // ✅ NEW: Modify instructions based on engagement history
    let modifiedInstructions = aiInstructions.value;

    if (hasEverResponded) {
      // Add context for re-engagement
      const reengagementPrefix = `IMPORTANT CONTEXT: This lead has previously engaged with us in conversation but has gone silent. 
  
Adjust your approach accordingly:
- Reference that we've been in touch before (but don't be specific about dates/times)
- Use a warmer, more familiar tone as if continuing a conversation
- Show understanding that they might be busy or priorities might have changed
- Avoid sounding like this is a cold first-time outreach
- Keep the message brief and friendly
- Consider asking if their situation or needs have changed

Remember: This is follow-up #${follow_up_stage} to someone who WAS engaged but stopped responding.

Now, follow these instructions with the above context in mind:

`;

      modifiedInstructions = reengagementPrefix + modifiedInstructions;
      console.log(`🔄 Using re-engagement approach for lead ${lead_id} (${lead.name}) who previously responded`);
    } else {
      console.log(`📤 Using standard follow-up approach for lead ${lead_id} (${lead.name}) who never responded`);
    }

    // 6. Get field configuration for this tenant
    const { data: fieldConfig, error: fieldError } = await supabase
      .from("lead_field_config")
      .select("field_name, field_label")
      .eq("tenant_id", tenant_id);

    if (fieldError) {
      console.error("❌ Error fetching field config:", fieldError);
    }

    // 7. Inject this lead's data into the follow-up template
    const genericTemplate = modifiedInstructions; // Now using the modified version
    const personalizedInstructions = injectLeadDataIntoTemplate(
      genericTemplate,
      lead,
      fieldConfig || []
    );

    console.log(`📋 Personalized follow-up ${follow_up_stage} instructions for ${lead.name}:`, personalizedInstructions.substring(0, 200) + '...');

    // 8. Generate AI message using OpenAI with personalized instructions
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    const aiPrompt = `${personalizedInstructions}

Campaign: ${campaign.name}
Campaign Description: ${campaign.description || ""}

This is follow-up message #${follow_up_stage}. Generate a personalized follow-up message for this lead based on the instructions above.`;

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
            content: "You are an AI assistant that generates personalized sales follow-up messages."
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
    const aiOutput = openaiData.choices[0]?.message?.content?.trim();

    // ✅ FIXED: Parse the response to extract just the message part
    let aiMessage = aiOutput;
    
    // Check if the output contains the structured format
    if (aiOutput?.includes('Response:')) {
      const responseMatch = aiOutput.match(/Response:\s*([\s\S]*)/);
      aiMessage = responseMatch?.[1]?.trim() || aiOutput;
      console.log(`📝 Extracted response from structured output`);
    } else if (aiOutput?.includes('Initial Message:')) {
      // Handle initial message format
      const initialMatch = aiOutput.match(/Initial Message:\s*([\s\S]*)/);
      aiMessage = initialMatch?.[1]?.trim() || aiOutput;
      console.log(`📝 Extracted initial message from structured output`);
    }

    if (!aiMessage) {
      throw new Error("Failed to generate AI follow-up message");
    }

    console.log(`📝 Generated AI follow-up ${follow_up_stage} message: ${aiMessage}`);

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
    console.log(`📤 Follow-up ${follow_up_stage} SMS sent successfully. Twilio SID: ${twilioData.sid}`);

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
      console.error("❌ Error logging follow-up message:", messageError);
    }

    // 11. Update lead's follow-up stage and timestamps
    const updateData: any = {
      follow_up_stage: follow_up_stage,
      last_outbound_at: new Date().toISOString(),
      last_contacted: new Date().toISOString(),
      last_message_at: new Date().toISOString()
    };

    // If this was the final follow-up (stage 3), mark sequence as complete
    if (follow_up_stage === 3) {
      updateData.follow_up_stage = 4; // 4 = sequence complete
    }

    const { error: updateError } = await supabase
      .from("leads")
      .update(updateData)
      .eq("id", lead_id);

    if (updateError) {
      console.error("❌ Error updating lead follow-up stage:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `AI follow-up ${follow_up_stage} sent successfully`,
        twilio_sid: twilioData.sid,
        ai_message: aiMessage,
        follow_up_stage: follow_up_stage,
        sequence_complete: follow_up_stage === 3,
        was_reengagement: hasEverResponded
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (err) {
    console.error("❗ Unexpected error in ai-followup-outreach:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal Server Error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});