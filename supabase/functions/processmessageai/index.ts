// Complete index.ts with conversation history integration and Twilio SMS sending

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const googleApiKey = Deno.env.get('GOOGLE_CLOUD_API_KEY');

if (!openaiApiKey) {
  console.error('❌ OPENAI_API_KEY is not set');
}

if (!googleApiKey) {
  console.error('❌ GOOGLE_CLOUD_API_KEY is not set');
}

// Function to get random delay for human-like responses
function getRandomDelay(): number {
  // Random delay between 45 seconds and 3 minutes (in milliseconds)
  const minDelay = 45 * 1000;  // 45 seconds
  const maxDelay = 180 * 1000; // 3 minutes
  
  const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  console.log(`🕐 Random delay selected: ${delay / 1000} seconds`);
  return delay;
}

// Helper function to calculate next business hour
function getNextBusinessHour(currentTime: Date, openHour: number, officeDays: string[]): Date {
  const nextDay = new Date(currentTime);
  nextDay.setHours(openHour, 0, 0, 0);
  
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const currentDayName = dayNames[currentTime.getDay()];
  
  // If it's still today but before opening, respond at open hour today
  if (currentTime.getHours() < openHour && officeDays.includes(currentDayName)) {
    return nextDay;
  }
  
  // Otherwise, find next business day
  do {
    nextDay.setDate(nextDay.getDate() + 1);
    const dayName = dayNames[nextDay.getDay()];
    if (officeDays.includes(dayName)) {
      return nextDay;
    }
  } while (true);
}

// Function to get sentiment from Google Natural Language API
async function getSentiment(text: string): Promise<{score: number, magnitude: number}> {
  try {
    if (!googleApiKey) {
      console.error('❌ Google API key not available');
      return { score: 0, magnitude: 0 };
    }

    console.log('🔍 Calling Google Natural Language API for text:', text.substring(0, 100) + '...');
    
    const response = await fetch(`https://language.googleapis.com/v1/documents:analyzeSentiment?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        document: {
          type: 'PLAIN_TEXT',
          content: text
        },
        encodingType: 'UTF8'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Google Natural Language API error:', response.status, response.statusText);
      console.error('❌ Error details:', errorText);
      return { score: 0, magnitude: 0 }; 
    }

    const data = await response.json();
    const sentiment = data.documentSentiment;
    
    console.log('✅ Google Natural Language API sentiment result:', sentiment);
    return { 
      score: sentiment?.score || 0, 
      magnitude: sentiment?.magnitude || 0 
    };

  } catch (err) {
    console.error('❗ Error in getSentiment function:', err);
    return { score: 0, magnitude: 0 }; 
  }
}

// Fixed calculateWeightedScore function
function calculateWeightedScore(
    motivation: number,     
    hesitation: number,     
    urgency: number,        
    sentiment_score: number,
    contextual_sentiment: number
): number {
    // Normalize sentiment_score from [-1, 1] to [0, 100] for calculation purposes.
    const normalizedSentiment = ((sentiment_score + 1) / 2) * 100;
    
    // Invert hesitation properly - higher hesitation should lower the score
    const hesitationContribution = Math.max(0, 100 - hesitation);
    
    // Adjusted weights
    const motivationWeight = 0.30;
    const urgencyWeight = 0.25;
    const hesitationWeight = 0.20;
    const sentimentWeight = 0.10;
    const contextualSentimentWeight = 0.15;
    
    const score = (
        motivation * motivationWeight +
        urgency * urgencyWeight +
        hesitationContribution * hesitationWeight +
        normalizedSentiment * sentimentWeight +
        contextual_sentiment * contextualSentimentWeight
    );
    
    console.log('🧮 Score Calculation:', {
        motivation,
        urgency,
        hesitation,
        hesitationContribution,
        sentiment_score,
        normalizedSentiment,
        contextual_sentiment,
        finalScore: Math.round(score)
    });
    
    return Math.round(Math.max(1, Math.min(100, score)));
}

// ✅ NEW: Runtime function to inject lead data into template
const generateLeadDetailsBlock = (lead: any = {}, fieldConfig: any[] = []) => {
  console.log('🔍 generateLeadDetailsBlock called with:');
  console.log('- lead:', JSON.stringify(lead, null, 2));
  console.log('- fieldConfig:', JSON.stringify(fieldConfig, null, 2));
  
  if (!lead || !fieldConfig.length) {
    console.log('⚠️ Returning empty - no lead or no fieldConfig');
    return '';
  }

  // Standard lead table columns that might be in field config
  const standardFields = ['name', 'phone', 'email', 'status', 'campaign', 'created_at', 'last_contacted', 'notes', 'assigned_to'];
  
  // Check if lead has custom_fields and if it's an object
  const customFields = lead.custom_fields || {};
  console.log('- customFields:', JSON.stringify(customFields, null, 2));
  
  // Remove duplicates by field_name first
  const uniqueFields = fieldConfig.filter((field: any, index: number, self: any[]) => 
    index === self.findIndex(f => f.field_name === field.field_name)
  );

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
      
      console.log(`- Field ${f.field_name} (${standardFields.includes(f.field_name) ? 'standard' : 'custom'}): ${val}`);
      
      // Skip if value is undefined, null, or empty string
      if (val === undefined || val === null || val === '') return null;
      
      return `- ${f.field_label || f.field_name}: ${val}`;
    })
    .filter(Boolean);

  console.log('- Generated lines:', lines);

  if (!lines.length) {
    console.log('⚠️ No lines generated - returning empty');
    return '';
  }

  const result = `\n=== LEAD DETAILS ===\n${lines.join('\n')}\n`;
  console.log('✅ Final lead details block:', result);
  return result;
};

const injectLeadDataIntoTemplate = (template: string, lead: any = {}, fieldConfig: any[] = []) => {
  const leadDetailsBlock = generateLeadDetailsBlock(lead, fieldConfig);
  return template.replace('{{LEAD_DETAILS_PLACEHOLDER}}', leadDetailsBlock);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return new Response('Server configuration error', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let requestBody;
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error('❌ Invalid JSON in request body:', jsonError);
      return new Response('Invalid JSON request body', { status: 400 });
    }

    const { message_id, tenant_id: request_tenant_id } = requestBody;
    
    if (!message_id || !request_tenant_id) {
      console.error('❌ Missing required parameters: message_id or tenant_id');
      return new Response('Missing required parameters: message_id and tenant_id', { status: 400 });
    }
    
    console.log('📩 processmessageai: Received request with message_id:', message_id);
    console.log('📩 processmessageai: Received request with tenant_id:', request_tenant_id);

    let messageRow = null;
    let attempts = 0;
    const maxAttempts = 5; 
    const delayMs = 500; 

    while (!messageRow && attempts < maxAttempts) {
      if (attempts > 0) {
        console.log(`⏳ processmessageai: Retrying message lookup (attempt ${attempts + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delayMs)); 
      }

      const { data, error } = await supabase
        .from('messages')
        .select('lead_id, phone, message_body, tenant_id') 
        .eq('id', message_id) 
        .maybeSingle();

      if (error) {
        console.error(`❌ Database error on attempt ${attempts + 1}:`, error);
      }

      messageRow = data;
      console.log(`🔍 processmessageai: Attempt ${attempts + 1} - Query Result:`, messageRow);

      attempts++;
    }

    if (!messageRow) {
      console.error('❌ Message not found for AI processing after multiple attempts:', message_id);
      return new Response('Message not found for AI processing after retries', { status: 404 });
    }

    if (messageRow.tenant_id !== request_tenant_id) {
        console.error('❌ Tenant ID mismatch:', messageRow.tenant_id, 'vs', request_tenant_id);
        return new Response('Unauthorized: Message does not belong to specified tenant', { status: 403 });
    }

    const { lead_id, phone, message_body, tenant_id } = messageRow; 
    console.log('✅ Message found and verified: lead_id=', lead_id, 'phone=', phone);

    // ✅ NEW: Fetch lead data for injection
    console.log('📋 Fetching lead data for engagement instructions...');
const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError) {
      console.error('❌ Error fetching lead data:', leadError);
      return new Response('Failed to load lead data', { status: 500 });
    }

    console.log('✅ Lead data fetched:', {
      name: lead.name,
      phone: lead.phone,
      customFieldsCount: lead.custom_fields ? Object.keys(lead.custom_fields).length : 0
    });

    // Get the lead's campaign to find the correct phone number
    const campaignId = lead.campaign_id;
    if (!campaignId) {
      console.error("❌ Lead has no campaign assigned");
      return new Response('Lead must be assigned to a campaign', { status: 400 });
    }

    // ✅ NEW: Fetch field configuration for this tenant
    console.log('📋 Fetching field configuration for engagement instructions...');
    const { data: fieldConfig, error: fieldError } = await supabase
      .from('lead_field_config')
      .select('field_name, field_label')
      .eq('tenant_id', tenant_id);

    if (fieldError) {
      console.error('❌ Error fetching field config:', fieldError);
    }

    console.log(`✅ Field configuration fetched: ${fieldConfig?.length || 0} fields`);

    // Perform Sentiment Analysis
    const sentiment = await getSentiment(message_body);

    // Get message history
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('message_body, direction, timestamp')
      .eq('lead_id', lead_id)
      .order('timestamp', { ascending: true });

    if (msgError) {
      console.error('❌ Error fetching message history:', msgError);
      return new Response('Failed to load message history', { status: 500 });
    }

    const messageHistory = messages || [];

    // Build formatted history for OpenAI
    const formattedHistory = messageHistory.map(msg =>
      `${msg.direction === 'inbound' ? 'User' : 'AI'}: ${msg.message_body}`
    ).join('\n');

    // Build conversation history with timestamps
    const conversationHistoryForStorage = messageHistory.map(msg => {
      const timestamp = new Date(msg.timestamp).toLocaleString();
      return `[${timestamp}] ${msg.direction === 'inbound' ? 'User' : 'AI'}: ${msg.message_body}`;
    }).join('\n');

    const currentTimestamp = new Date().toLocaleString();
    const updatedConversationHistory = conversationHistoryForStorage + 
      `\n[${currentTimestamp}] User: ${message_body}`;

    // ✅ UPDATED: Fetch instruction bundle for SYSTEM message
    console.log('📋 Fetching engagement instruction bundle for tenant:', tenant_id);
    const { data: settings, error: settingsError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'aiinstruction_bundle')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    if (settingsError || !settings?.value) {
      console.error('❌ Error fetching instruction bundle:', settingsError);
      return new Response('Failed to load AI instructions', { status: 500 });
    }

    console.log('✅ Engagement instruction bundle fetched successfully');
    const systemInstructions = settings.value; // Raw instructions for system message

    // ✅ NEW: Create lead details block for USER message
    console.log('📋 Building lead details for user context...');
    const leadDetailsBlock = generateLeadDetailsBlock(lead, fieldConfig || []);
    
    console.log('📋 Lead details block created:', leadDetailsBlock.substring(0, 200) + '...');

    // ✅ NEW: Separate SYSTEM and USER messages
    const systemMessage = `NEVER use the lead's name. NEVER say "folks". NEVER start with "Hey [name]".

${settings.value.replace('{{LEAD_DETAILS_PLACEHOLDER}}', '')}

FINAL REMINDER: Your response must NOT contain the lead's name anywhere.`; // Pure instructions

    const userMessage = `CONVERSATION HISTORY:
${formattedHistory}

${leadDetailsBlock}

CURRENT MESSAGE: ${message_body}`;

console.log('🔍 SYSTEM MESSAGE CONTENT (first 500 chars):', systemMessage.substring(0, 500));
console.log('🔍 SYSTEM MESSAGE CONTENT (last 500 chars):', systemMessage.substring(systemMessage.length - 500));
console.log('🔍 System message contains LEAD_DETAILS_PLACEHOLDER:', systemMessage.includes('{{LEAD_DETAILS_PLACEHOLDER}}'));
console.log('🔍 System message total length:', systemMessage.length);
console.log('🔍 After placeholder removal, system message length:', systemMessage.length);
console.log('🔍 System message now contains "Closer":', systemMessage.includes('Closer'));
console.log('🔍 System message now contains "Never use the name":', systemMessage.includes('Never use the name'));

    if (!openaiApiKey) {
      console.error('❌ OpenAI API key not available');
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    console.log('🤖 Calling OpenAI with SYSTEM + USER message architecture...');
    console.log('📋 System message length:', systemMessage.length, 'characters');
    console.log('📋 User message length:', userMessage.length, 'characters');
    
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: systemMessage 
          },
          { 
            role: 'user', 
            content: userMessage 
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
        const errorText = await openaiRes.text();
        console.error('❌ OpenAI API error:', openaiRes.status, openaiRes.statusText, errorText);
        return new Response(`OpenAI API Error: ${openaiRes.statusText}`, { status: 500 });
    }

    const result = await openaiRes.json();
    const output = result.choices?.[0]?.message?.content || '';
    console.log('🧠 Raw AI Output:', output);
    console.log('🔍 MOTIVATION MATCH:', output.match(/Motivation Score:\s*(\d+)/));
console.log('🔍 HESITATION MATCH:', output.match(/Hesitation Score:\s*(\d+)/));
console.log('🔍 URGENCY MATCH:', output.match(/Urgency Score:\s*(\d+)/));
console.log('🔍 CONTEXTUAL MATCH:', output.match(/Contextual Sentiment Score:\s*(\d+)/));

    const parsed = {
      motivation: parseInt(output.match(/Motivation Score:\s*(\d+)/)?.[1] || '0'),
      hesitation: parseInt(output.match(/Hesitation Score:\s*(\d+)/)?.[1] || '0'),
      urgency: parseInt(output.match(/Urgency Score:\s*(\d+)/)?.[1] || '0'),
      contextual_sentiment: parseInt(output.match(/Contextual Sentiment Score:\s*(\d+)/)?.[1] || '0'),
      summary: output.match(/Summary:\s*(.*)/)?.[1]?.trim() || '',
      status: output.match(/Status:\s*(Hot Lead|Warm Lead|Cold Lead)/)?.[1] || 'Cold Lead',
      response: output.match(/Response:\s*([\s\S]*)/)?.[1]?.trim() || '',
    };

    // Calculate weighted score
    const weighted_score = calculateWeightedScore(
      parsed.motivation,
      parsed.hesitation,
      parsed.urgency,
      sentiment.score,
      parsed.contextual_sentiment
    );

    // Lead Status Update Logic
    const { data: thresholdData, error: thresholdError } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'ai_min_escalation_score')
      .eq('tenant_id', tenant_id)
      .maybeSingle();

    const escalationThreshold = thresholdData ? parseInt(thresholdData.value) : 70;

    let newStatus = '';
    if (weighted_score >= escalationThreshold) {
      newStatus = 'Hot Lead';
    } else if (weighted_score >= 60) {
      newStatus = 'Engaged';
    } else if (weighted_score >= 50) {
      newStatus = 'Warm Lead';
    } else if (weighted_score >= 20) {
      newStatus = 'Cold Lead';
    }

    // ✅ NEW: Extract timing preferences from the conversation
    console.log('📅 Checking for timing preferences in message...');
// Replace the timing analysis section in processmessageai with this smarter version

const timingAnalysisPrompt = `
Analyze this message and the conversation context to determine the optimal follow-up timing.

MESSAGE: ${message_body}
LEAD STATUS: ${newStatus}
ENGAGEMENT SCORE: ${weighted_score}

Consider:
1. Explicit timing if mentioned (e.g., "call me in 2 months")
2. Implicit timing from context:
   - "not interested right now" → suggest 30-60 days
   - "too busy" → suggest 14-21 days  
   - "not ready" → suggest 45-90 days
   - "just looking" → suggest 7-14 days
   - Strong rejection → suggest 90+ days or never
3. Engagement level:
   - High score (60+) with timing concern → shorter delay
   - Low score (under 40) → longer delay
   - Hot lead status → very short delay (1-3 days)

Make an intelligent decision about when to follow up based on:
- The tone and content of their message
- Their engagement level
- Sales psychology (not too pushy, not too distant)

Return JSON with:
{
  "TIMING_FOUND": true/false,
  "REQUESTED_DELAY_DAYS": number (your intelligent recommendation),
  "TIMING_TYPE": "explicit_request" | "implicit_context" | "ai_recommendation",
  "ORIGINAL_PHRASE": what they said,
  "AI_REASONING": brief explanation of why you chose this timing
}

Examples:
- "not interested right now" + low engagement → {"TIMING_FOUND": true, "REQUESTED_DELAY_DAYS": 60, "TIMING_TYPE": "implicit_context", "ORIGINAL_PHRASE": "not interested right now", "AI_REASONING": "Low interest suggests waiting 2 months before re-engaging"}
- "super busy this month" + high engagement → {"TIMING_FOUND": true, "REQUESTED_DELAY_DAYS": 30, "TIMING_TYPE": "implicit_context", "ORIGINAL_PHRASE": "super busy this month", "AI_REASONING": "High engagement but busy - check back after their busy period"}
`;

    try {
      const timingResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'Extract timing information from messages. Return valid JSON only.' },
            { role: 'user', content: timingAnalysisPrompt }
          ],
          temperature: 0.1,
        }),
      });

      if (timingResponse.ok) {
        const timingResult = await timingResponse.json();
        const timingData = JSON.parse(timingResult.choices[0].message.content);

        if (timingData.TIMING_FOUND) {
          console.log(`📅 Lead requested specific timing: ${timingData.ORIGINAL_PHRASE} (${timingData.REQUESTED_DELAY_DAYS} days)`);
          
          // Calculate the requested follow-up date
          const requestedDate = new Date(Date.now() + (timingData.REQUESTED_DELAY_DAYS * 24 * 60 * 60 * 1000));
          
          // Update lead record with timing preferences
          const { error: timingUpdateError } = await supabase
            .from('leads')
            .update({
              requested_followup_date: requestedDate.toISOString(),
              requested_followup_reason: timingData.ORIGINAL_PHRASE,
              requested_followup_type: timingData.TIMING_TYPE
            })
            .eq('id', lead_id);

          if (timingUpdateError) {
            console.error('❌ Error updating lead timing preferences:', timingUpdateError);
          } else {
            console.log('✅ Lead timing preferences saved');
          }
        }
      }
    } catch (timingError) {
      console.error('❌ Error analyzing timing preferences:', timingError);
    }

    if (newStatus) {
      const { error: updateLeadError } = await supabase
        .from('leads')
        .update({ status: newStatus })
        .eq('id', lead_id);

      if (updateLeadError) {
        console.error('❌ Error updating lead status:', updateLeadError);
      } else {
        console.log(`✅ Lead status updated to "${newStatus}" for lead_id:`, lead_id);
      }
    }

    // Update the inbound message with AI analysis
    const { error: updateError } = await supabase.from('messages')
      .update({
        response_score: parsed.motivation,
        hesitation_score: parsed.hesitation,
        urgency_score: parsed.urgency,
        openai_reasoning: parsed.summary,
        weighted_score: weighted_score,
        processed_for_ai: true,
        sentiment_score: sentiment.score,
        sentiment_magnitude: sentiment.magnitude,
        contextual_sentiment_score: parsed.contextual_sentiment,
        conversation_history: updatedConversationHistory
      })
      .eq('id', message_id);

    if (updateError) {
      console.error('❌ Failed to update inbound message:', updateError);
      return new Response('Failed to save AI analysis', { status: 500 });
    }

    // Insert AI response
    const aiResponseTimestamp = new Date().toLocaleString();
    const finalConversationHistory = updatedConversationHistory + 
      `\n[${aiResponseTimestamp}] AI: ${parsed.response}`;

    const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert({
      direction: 'outbound',
      message_body: parsed.response,
      timestamp: new Date().toISOString(),
      phone,
      tenant_id,
      lead_id,
      sender: 'AI',
      channel: 'sms',
      message_id: `ai-${Date.now()}`,
      conversation_history: finalConversationHistory
    }).select('id');

    if (insertError || !insertedMessage || insertedMessage.length === 0) {
      console.error('❌ Failed to insert AI response:', insertError);
      return new Response('Failed to save AI response', { status: 500 });
    }

    // ✅ TRIGGER LEAD SCORING
    console.log('📊 Triggering lead scoring...');
    try {
      const scoreLeadUrl = `${supabaseUrl}/functions/v1/score-lead`;
      const scoreResponse = await fetch(scoreLeadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lead_id: lead_id,
          tenant_id: tenant_id
        })
      });

      if (!scoreResponse.ok) {
        const errorText = await scoreResponse.text();
        console.error('❌ Lead scoring failed:', scoreResponse.status, errorText);
      } else {
        const scoreResult = await scoreResponse.json();
        console.log('✅ Lead scoring completed:', scoreResult);
      }
    } catch (scoreError) {
      console.error('❌ Error calling lead scoring function:', scoreError);
      // Don't fail the main request if scoring fails
    }

    // ✅ NEW: Check business hours before sending
    console.log('🕐 Checking business hours...');
    const { data: businessSettings } = await supabase
      .from("platform_settings")
      .select("key, value")
      .eq("tenant_id", tenant_id)
      .in("key", ["timezone", "officeOpenHour", "officeCloseHour", "officeDays"]);

    const settingsMap = businessSettings?.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {}) || {};

    const timezone = settingsMap.timezone === "EST" ? "America/New_York" : "America/New_York";
    const openHour = parseInt(settingsMap.officeOpenHour || "8");
    const closeHour = parseInt(settingsMap.officeCloseHour || "17");
    const officeDays = (settingsMap.officeDays || "Monday,Tuesday,Wednesday,Thursday,Friday").split(",");

    // Check current time in business timezone
    const now = new Date();
    const businessTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const hour = businessTime.getHours();
    const dayOfWeek = businessTime.getDay();
    const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek];

    // If outside business hours, save the message but don't send
    if (hour < openHour || hour >= closeHour || !officeDays.includes(dayName)) {
      console.log(`⏰ Outside business hours (${hour}:00 ${dayName}) - queuing message for next business day`);
      
      const nextBusinessHour = getNextBusinessHour(businessTime, openHour, officeDays);
      console.log(`📅 Message will be sent at: ${nextBusinessHour.toLocaleString()}`);
      
      // Update the message with scheduled send time
      await supabase.from('messages')
        .update({
          business_hours_hold: true,
          scheduled_response_time: nextBusinessHour.toISOString()
        })
        .eq('id', insertedMessage[0].id);
      
      console.log('✅ Message queued for business hours delivery');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Message received and queued for business hours response',
          scheduled_time: nextBusinessHour.toLocaleString(),
          analysis: {
            weighted_score,
            status: newStatus || lead.status,
            timing_detected: parsed.timing_detected
          }
        }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ✅ EXISTING: Send AI response via Twilio (with human-like delay)
    console.log('📤 Within business hours - preparing to send AI response via Twilio...');
    
    // Add random delay to simulate human typing/thinking
    const delay = getRandomDelay();
    console.log(`⏳ Waiting ${delay / 1000} seconds before sending to appear more human...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Get tenant's Twilio phone number
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
      .eq("id", campaignId)
      .eq("tenant_id", tenant_id)
      .single();

    if (phoneError || !campaignPhone || !campaignPhone.phone_numbers) {
      console.error("❌ Error fetching campaign phone number:", phoneError);
      // Don't fail the entire request - message is saved, just not sent
    } else {
      const phoneNumber = campaignPhone.phone_numbers;
      // Send SMS via Twilio
      const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
      const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");

      if (!twilioSid || !twilioToken) {
        console.error("❌ Twilio credentials not configured");
      } else {
        try {
          console.log('📱 Sending SMS after human-like delay...');
          const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
            method: "POST",
            headers: {
              "Authorization": `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              From: phoneNumber.phone_number,
              To: lead.phone,
              Body: parsed.response,
            }),
          });

          if (!twilioResponse.ok) {
            const twilioError = await twilioResponse.text();
            console.error(`❌ Twilio SMS sending failed: ${twilioError}`);
          } else {
            const twilioData = await twilioResponse.json();
            console.log(`✅ AI response sent via SMS after ${delay / 1000}s delay. Twilio SID: ${twilioData.sid}`);
            
            // Update the message record with the Twilio SID
            await supabase.from('messages')
              .update({ message_id: twilioData.sid })
              .eq('id', insertedMessage[0].id);
          }
        } catch (twilioErr) {
          console.error('❌ Error calling Twilio API:', twilioErr);
        }
      }
    }

    console.log('✅ AI analysis complete, response sent');
    return new Response('AI analysis processed successfully', { headers: corsHeaders });

  } catch (err) {
    console.error('❗ Unexpected error:', err);
    return new Response('Unexpected server error', { status: 500 });
  }
});