// Complete index.ts with conversation history integration, Twilio SMS sending, and LEARNING ENGINE

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
function getNextBusinessHour(currentTime: Date, openHour: number, officeDays: string[], tenantTimezone: string): Date {
 // Create a proper date for the next business day in the business timezone
 const nextDay = new Date(currentTime);
 
 const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
 const currentDayName = dayNames[currentTime.getDay()];
 
 // Map tenant timezone setting to UTC offset hours
 let offsetHours = 5; // Default to EST offset
 
 if (tenantTimezone === "EST") {
   // EST is always UTC-5
   offsetHours = 5;
 } else if (tenantTimezone === "EDT") {
   // EDT is always UTC-4  
   offsetHours = 4;
 } else if (tenantTimezone === "CST") {
   // CST is always UTC-6
   offsetHours = 6;
 } else if (tenantTimezone === "CDT") {
   // CDT is always UTC-5
   offsetHours = 5;
 } else if (tenantTimezone === "MST") {
   // MST is always UTC-7
   offsetHours = 7;
 } else if (tenantTimezone === "MDT") {
   // MDT is always UTC-6
   offsetHours = 6;
 } else if (tenantTimezone === "PST") {
   // PST is always UTC-8
   offsetHours = 8;
 } else if (tenantTimezone === "PDT") {
   // PDT is always UTC-7
   offsetHours = 7;
 } else if (tenantTimezone === "America/New_York") {
   // Auto-adjust for daylight saving time (Eastern)
   const month = new Date().getMonth();
   offsetHours = (month >= 2 && month <= 10) ? 4 : 5; // EDT (Mar-Nov) vs EST (Dec-Feb)
 } else if (tenantTimezone === "America/Chicago") {
   // Auto-adjust for daylight saving time (Central)
   const month = new Date().getMonth();
   offsetHours = (month >= 2 && month <= 10) ? 5 : 6; // CDT vs CST
 } else if (tenantTimezone === "America/Denver") {
   // Auto-adjust for daylight saving time (Mountain)
   const month = new Date().getMonth();
   offsetHours = (month >= 2 && month <= 10) ? 6 : 7; // MDT vs MST
 } else if (tenantTimezone === "America/Los_Angeles") {
   // Auto-adjust for daylight saving time (Pacific)
   const month = new Date().getMonth();
   offsetHours = (month >= 2 && month <= 10) ? 7 : 8; // PDT vs PST
 } else {
   // Unknown timezone - default to EST
   console.warn(`⚠️ Unknown timezone "${tenantTimezone}" - defaulting to EST (UTC-5)`);
   offsetHours = 5;
 }
 
 // If it's still today but before opening, respond at open hour today
 if (currentTime.getHours() < openHour && officeDays.includes(currentDayName)) {
   // Create date string in business timezone and convert properly to UTC
   const todayString = currentTime.toISOString().split('T')[0]; // Get YYYY-MM-DD
   const businessDateTime = `${todayString}T${openHour.toString().padStart(2, '0')}:00:00`;
   
   const localDate = new Date(businessDateTime);
   return new Date(localDate.getTime() + (offsetHours * 60 * 60 * 1000));
 }
 
 // Otherwise, find next business day
 do {
   nextDay.setDate(nextDay.getDate() + 1);
   const dayName = dayNames[nextDay.getDay()];
   if (officeDays.includes(dayName)) {
     // Create proper date string for next business day
     const nextDayString = nextDay.toISOString().split('T')[0];
     const businessDateTime = `${nextDayString}T${openHour.toString().padStart(2, '0')}:00:00`;
     
     const localDate = new Date(businessDateTime);
     return new Date(localDate.getTime() + (offsetHours * 60 * 60 * 1000));
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

// ✅ NEW: Plan-based learning functions
const getTenantPlan = async (supabase: any, tenantId: string) => {
 const { data, error } = await supabase
   .from('tenants')
   .select('plan')
   .eq('id', tenantId)
   .single();
   
 if (error || !data) {
   console.warn('Could not fetch tenant plan, defaulting to starter');
   return 'starter';
 }
 
 return data.plan || 'starter';
};

const getFeatureValue = (plan: string, feature: string) => {
 const PLAN_FEATURES: any = {
   starter: {
     conversationMemory: 0,
   },
   growth: {
     conversationMemory: 100,
   },
   scale: {
     conversationMemory: 1000,
   },
   enterprise: {
     conversationMemory: -1,
   }
 };
 
 return PLAN_FEATURES[plan]?.[feature] || 0;
};

const getOptimizedApproach = async (supabase: any, tenantId: string, leadPsychProfile?: any) => {
  try {
    // Get tenant's plan
    const tenantPlan = await getTenantPlan(supabase, tenantId);
    
    // Get conversation memory limit from plan
    const conversationLimit = getFeatureValue(tenantPlan, 'conversationMemory');
    
    // If starter plan (limit = 0), return default approach
    if (conversationLimit === 0) {
      console.log(`🎯 Tenant ${tenantId} on ${tenantPlan} plan - no AI learning, using default approach`);
      return {
        tone: 'Friendly & Casual',
        psychologicalTechniques: [],
        messageLength: 120,
        confidence: 0
      };
    }

    console.log(`🎯 AI Learning: ${tenantPlan} plan (limit: ${conversationLimit === -1 ? 'unlimited' : conversationLimit})`);

    // 1. Get personality-based optimization if we have lead's psychological profile
    let personalityOptimization = null;
    if (leadPsychProfile) {
      const { data: personalityPatterns } = await supabase
        .from('personality_response_patterns')
        .select('best_tone_approach, best_psychological_approach, optimal_message_length, avg_conversion_rate')
        .eq('tenant_id', tenantId)
        .eq('decisiveness_range', categorizeScore(leadPsychProfile.personality_decisiveness_score))
        .eq('skepticism_range', categorizeScore(leadPsychProfile.personality_skepticism_score))
        .eq('motivation_range', categorizeScore(leadPsychProfile.motivation_score))
        .order('avg_conversion_rate', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (personalityPatterns) {
        personalityOptimization = personalityPatterns;
        console.log(`🎯 Found personality-based optimization: ${personalityPatterns.best_tone_approach}`);
      }
    }

    // 2. Get most effective message patterns for this tenant
    let query = supabase
      .from('message_psychology_analytics')
      .select('tone_approach, psychological_technique, emotional_appeal_type, psychological_effectiveness_score, response_rate')
      .eq('tenant_id', tenantId)
      .order('psychological_effectiveness_score', { ascending: false });

    // Apply plan-based limit
    if (conversationLimit !== -1) {
      query = query.limit(conversationLimit);
    }

    const { data: messagePatterns, error } = await query;

    if (error || !messagePatterns || messagePatterns.length === 0) {
      console.warn('No message psychology analytics found, falling back to personality optimization or default');
      
      if (personalityOptimization) {
        return {
          tone: personalityOptimization.best_tone_approach || 'Friendly & Casual',
          psychologicalTechniques: personalityOptimization.best_psychological_approach?.split(',') || [],
          messageLength: personalityOptimization.optimal_message_length || 120,
          confidence: 0.7
        };
      }
      
      return {
        tone: 'Friendly & Casual',
        psychologicalTechniques: [],
        messageLength: 120,
        confidence: 0
      };
    }

    // 3. Analyze top performing patterns
    const topPatterns = messagePatterns.slice(0, Math.min(10, messagePatterns.length));
    
    // Get most effective tone
    const toneEffectiveness = {};
    topPatterns.forEach(pattern => {
      if (pattern.tone_approach) {
        if (!toneEffectiveness[pattern.tone_approach]) {
          toneEffectiveness[pattern.tone_approach] = [];
        }
        toneEffectiveness[pattern.tone_approach].push(pattern.psychological_effectiveness_score || 0);
      }
    });

    let bestTone = 'Friendly & Casual';
    let bestToneScore = 0;
    
    Object.keys(toneEffectiveness).forEach(tone => {
      const avgScore = toneEffectiveness[tone].reduce((sum, score) => sum + score, 0) / toneEffectiveness[tone].length;
      if (avgScore > bestToneScore) {
        bestToneScore = avgScore;
        bestTone = tone;
      }
    });

    // Get most effective psychological techniques
    const techniqueMap = {};
    topPatterns.forEach(pattern => {
      if (pattern.psychological_technique && pattern.psychological_technique !== 'none') {
        const techniques = pattern.psychological_technique.split(',');
        techniques.forEach(tech => {
          if (!techniqueMap[tech]) techniqueMap[tech] = [];
          techniqueMap[tech].push(pattern.psychological_effectiveness_score || 0);
        });
      }
    });

    const topTechniques = Object.keys(techniqueMap)
      .map(tech => ({
        technique: tech,
        avgScore: techniqueMap[tech].reduce((sum, score) => sum + score, 0) / techniqueMap[tech].length
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 3)
      .map(t => t.technique);

    // 4. Combine personality and pattern insights
    const finalApproach = {
      tone: personalityOptimization?.best_tone_approach || bestTone,
      psychologicalTechniques: topTechniques,
      messageLength: personalityOptimization?.optimal_message_length || 120,
      confidence: messagePatterns.length >= 10 ? 0.9 : 0.6
    };

    console.log(`🎯 Optimized approach selected:`, finalApproach);
    return finalApproach;

  } catch (error) {
    console.error('Error getting optimized approach:', error);
    return {
      tone: 'Friendly & Casual',
      psychologicalTechniques: [],
      messageLength: 120,
      confidence: 0
    };
  }
};

// Helper function to categorize scores into ranges
const categorizeScore = (score: number): string => {
  if (score < 30) return 'low_0-30';
  if (score < 70) return 'medium_30-70';
  return 'high_70-100';
};

// ==========================================
// 🧠 STEP 2: LEARNING ENGINE FUNCTIONS
// ==========================================

/**
 * Analyzes message effectiveness based on psychological responses
 */
async function analyzeMessagePsychology(supabase: any, tenantId: string, messageId: string, responseData: any) {
  try {
    console.log('🧠 Analyzing message psychology for learning...');
    
    // Get the message and its psychological impact
    const { data: message } = await supabase
      .from('messages')
      .select('message_body, direction, lead_id, ai_tone_used')
      .eq('id', messageId)
      .single();

    if (!message || message.direction !== 'outbound') return;

    // Get before/after psychological scores
const { data: beforeScores } = await supabase
  .from('lead_scores')
  .select('*')
  .eq('lead_id', message.lead_id)
  .order('created_at', { ascending: false })  // Use created_at instead
  .limit(2);

    if (!beforeScores || beforeScores.length < 2) return;

    const [current, previous] = beforeScores;

    // Extract message components
    const messageComponents = extractAdvancedMessageComponents(message.message_body, current);

    // Calculate psychological impact
    const psychologicalImpact = {
      decisiveness_change: (current.personality_decisiveness_score || 50) - (previous.personality_decisiveness_score || 50),
      skepticism_change: (current.personality_skepticism_score || 50) - (previous.personality_skepticism_score || 50),
      motivation_change: (current.motivation_score || 50) - (previous.motivation_score || 50),
      hesitation_change: (previous.hesitation_score || 50) - (current.hesitation_score || 50), // decrease is good
      urgency_change: (current.urgency_score || 50) - (previous.urgency_score || 50),
      engagement_change: (current.engagement_curve || 50) - (previous.engagement_curve || 50)
    };

    // Store learning data
    await supabase.from('message_psychology_analytics').upsert({
      tenant_id: tenantId,
      message_pattern_hash: hashMessage(messageComponents),
      opening_type: messageComponents.opening_type,
      question_style: messageComponents.question_style,
      tone_approach: messageComponents.tone_approach,
      value_prop_type: messageComponents.value_prop_type,
      cta_style: messageComponents.cta_style,
      avg_decisiveness_change: psychologicalImpact.decisiveness_change,
      avg_skepticism_change: psychologicalImpact.skepticism_change,
      avg_motivation_increase: psychologicalImpact.motivation_change,
      avg_hesitation_decrease: psychologicalImpact.hesitation_change,
      avg_urgency_boost: psychologicalImpact.urgency_change,
      avg_engagement_improvement: psychologicalImpact.engagement_change,
      response_rate: responseData.responded ? 1 : 0,
      sample_size: 1
    }, {
      onConflict: 'message_pattern_hash,tenant_id',
      ignoreDuplicates: false
    });

    console.log('📊 Psychological learning data captured for message pattern:', messageComponents.opening_type);

  } catch (error) {
    console.error('Error analyzing message psychology:', error);
  }
}

/**
 * Learns personality-based response patterns
 */
async function learnPersonalityPatterns(supabase: any, tenantId: string, leadId: string) {
  try {
    console.log('🧠 Learning personality patterns...');
    
    // Get lead's current psychological profile
    const { data: leadScore } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!leadScore) return;

    // Categorize personality
    const personalityCluster = categorizePersonality(leadScore);

    // Get conversation performance for this lead
    const { data: messages } = await supabase
      .from('messages')
      .select('message_body, direction, sentiment_score, response_score')
      .eq('lead_id', leadId)
      .order('timestamp');

    if (!messages) return;

    const conversationMetrics = analyzeConversationMetrics(messages);

    // Update personality pattern learning
    await supabase.from('personality_response_patterns').upsert({
      tenant_id: tenantId,
      decisiveness_range: personalityCluster.decisiveness_range,
      skepticism_range: personalityCluster.skepticism_range,
      motivation_range: personalityCluster.motivation_range,
      optimal_message_length: conversationMetrics.avg_message_length,
      preferred_question_density: conversationMetrics.question_density,
      best_tone_approach: conversationMetrics.most_effective_tone,
      optimal_followup_timing_hours: conversationMetrics.avg_response_time_hours,
      avg_conversion_rate: conversationMetrics.conversion_rate,
      avg_conversation_depth: leadScore.conversation_depth || 1,
      sample_size: 1
    }, {
      onConflict: 'decisiveness_range,skepticism_range,motivation_range,tenant_id',
      ignoreDuplicates: false
    });

    console.log('🧠 Personality pattern learning updated for cluster:', personalityCluster.decisiveness_range);

  } catch (error) {
    console.error('Error learning personality patterns:', error);
  }
}

/**
 * Analyzes conversation flow effectiveness
 */
async function analyzeConversationFlow(supabase: any, tenantId: string, leadId: string) {
  try {
    console.log('🧠 Analyzing conversation flow...');
    
    // Get full conversation sequence
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('lead_id', leadId)
      .order('timestamp');

    if (!messages || messages.length < 3) return; // Need minimum conversation

    // Extract conversation pattern
    const conversationFlow = extractConversationFlow(messages);
    
    // Get psychological journey
    const { data: scoreHistory } = await supabase
      .from('lead_scores')
      .select('*')
      .eq('lead_id', leadId)
      .order('updated_at');

    const psychologicalJourney = analyzePsychologicalJourney(scoreHistory || []);

    // Get final outcome
    const { data: finalScore } = await supabase
      .from('lead_scores')
      .select('hot_score, funnel_stage, requires_immediate_attention')
      .eq('lead_id', leadId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    // Store flow learning
    await supabase.from('conversation_flow_patterns').insert({
      tenant_id: tenantId,
      sequence_pattern: conversationFlow.sequence,
      conversation_stage: conversationFlow.stage,
      sentiment_trajectory: psychologicalJourney.sentiment_changes,
      engagement_curve: psychologicalJourney.engagement_changes,
      psychological_shifts: psychologicalJourney.psychological_changes,
      completion_rate: conversationFlow.completion_rate,
      escalation_success_rate: finalScore?.requires_immediate_attention ? 1 : 0,
      avg_final_hot_score: finalScore?.hot_score || 0,
      sample_size: 1
    });

    console.log('🔄 Conversation flow pattern captured');

  } catch (error) {
    console.error('Error analyzing conversation flow:', error);
  }
}

// ==========================================
// 🔧 HELPER FUNCTIONS FOR LEARNING
// ==========================================

function extractMessageComponents(messageBody: string) {
  return {
    opening_type: detectOpeningType(messageBody),
    question_style: detectQuestionStyle(messageBody),
    tone_approach: detectToneApproach(messageBody),
    value_prop_type: detectValuePropType(messageBody),
    cta_style: detectCTAStyle(messageBody)
  };
}

// ✅ NEW: Enhanced message component extraction with psychological analysis

function detectOpeningType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('?')) return 'question';
  if (lowerMessage.includes('noticed') || lowerMessage.includes('saw')) return 'observation';
  if (lowerMessage.includes('congrat') || lowerMessage.includes('great')) return 'compliment';
  return 'statement';
}

function detectQuestionStyle(message: string): string {
  const questionCount = (message.match(/\?/g) || []).length;
  
  if (questionCount === 0) return 'none';
  if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('no')) return 'yes_no';
  if (message.toLowerCase().includes('which') || message.toLowerCase().includes('option')) return 'choice';
  if (message.toLowerCase().includes('challenge') || message.toLowerCase().includes('problem')) return 'pain_point';
  return 'open_ended';
}

function detectToneApproach(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('need to') || lowerMessage.includes('should')) return 'direct';
  if (lowerMessage.includes('might') || lowerMessage.includes('perhaps')) return 'soft';
  if (lowerMessage.includes('hey') || lowerMessage.includes('hope')) return 'friendly';
  return 'neutral';
}

function detectValuePropType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('save') || lowerMessage.includes('increase')) return 'benefit';
  if (lowerMessage.includes('feature') || lowerMessage.includes('includes')) return 'feature';
  if (lowerMessage.includes('helped') || lowerMessage.includes('client')) return 'story';
  if (lowerMessage.includes('companies') || lowerMessage.includes('others')) return 'social_proof';
  return 'none';
}

function detectCTAStyle(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('call') || lowerMessage.includes('phone')) return 'call';
  if (lowerMessage.includes('meet') || lowerMessage.includes('chat')) return 'meet';
  if (lowerMessage.includes('reply') || lowerMessage.includes('let me know')) return 'respond';
  if (lowerMessage.includes('consider') || lowerMessage.includes('think')) return 'consider';
  return 'none';
}

function categorizePersonality(leadScore: any) {
  const categorize = (score: number) => {
    if (score < 30) return 'low_0-30';
    if (score < 70) return 'medium_30-70';
    return 'high_70-100';
  };

  return {
    decisiveness_range: categorize(leadScore.personality_decisiveness_score || 50),
    skepticism_range: categorize(leadScore.personality_skepticism_score || 50),
    motivation_range: categorize(leadScore.motivation_score || 50)
  };
}

function analyzeConversationMetrics(messages: any[]) {
  const outboundMessages = messages.filter(m => m.direction === 'outbound');
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  
  const avgMessageLength = outboundMessages.reduce((sum, m) => sum + (m.message_body?.length || 0), 0) / outboundMessages.length;
  const questionCount = outboundMessages.reduce((sum, m) => sum + ((m.message_body?.match(/\?/g) || []).length), 0);
  const questionDensity = questionCount / outboundMessages.length;
  
  // Analyze tone effectiveness
  const toneEffectiveness: any = {};
  outboundMessages.forEach(msg => {
    const tone = detectToneApproach(msg.message_body);
    if (!toneEffectiveness[tone]) toneEffectiveness[tone] = [];
    toneEffectiveness[tone].push(msg.sentiment_score || 0);
  });
  
  const mostEffectiveTone = Object.keys(toneEffectiveness).reduce((best, tone) => {
    const avgScore = toneEffectiveness[tone].reduce((sum: number, score: number) => sum + score, 0) / toneEffectiveness[tone].length;
    return avgScore > (toneEffectiveness[best]?.reduce((sum: number, score: number) => sum + score, 0) / toneEffectiveness[best]?.length || 0) ? tone : best;
  }, 'neutral');
  
  return {
    avg_message_length: Math.round(avgMessageLength),
    question_density: questionDensity,
    most_effective_tone: mostEffectiveTone,
    avg_response_time_hours: 24, // Default - could be calculated from timestamps
    conversion_rate: inboundMessages.length > 0 ? 1 : 0
  };
}

function extractConversationFlow(messages: any[]) {
  const sequence = messages.map(msg => ({
    direction: msg.direction,
    type: msg.direction === 'outbound' ? detectOpeningType(msg.message_body) : 'response',
    sentiment: msg.sentiment_score || 0
  }));
  
  return {
    sequence: sequence,
    stage: messages.length > 5 ? 'advanced' : 'opening',
    completion_rate: 1 // Simplified - conversation completed
  };
}

function analyzePsychologicalJourney(scoreHistory: any[]) {
  const sentimentChanges = scoreHistory.map(score => score.sentiment_score || 0);
  const engagementChanges = scoreHistory.map(score => score.engagement_curve || 0);
  const psychologicalChanges = {
    motivation: scoreHistory.map(score => score.motivation_score || 0),
    hesitation: scoreHistory.map(score => score.hesitation_score || 0),
    urgency: scoreHistory.map(score => score.urgency_score || 0)
  };
  
  return {
    sentiment_changes: sentimentChanges,
    engagement_changes: engagementChanges,
    psychological_changes: psychologicalChanges
  };
}

function hashMessage(components: any): string {
  const str = JSON.stringify(components);
  return btoa(str).substring(0, 32); // Simple hash for grouping similar messages
}

// ==========================================
// 🧠 ENHANCED PSYCHOLOGICAL DETECTION FUNCTIONS
// ==========================================

/**
 * Enhanced message component extraction with psychological analysis
 */
function extractAdvancedMessageComponents(messageBody: string, leadPsychProfile: any = {}) {
  const basicComponents = extractMessageComponents(messageBody);
  
  return {
    ...basicComponents,
    
    // Advanced psychological detection
    psychological_technique: detectPsychologicalTechniques(messageBody),
    emotional_appeal_type: detectEmotionalAppeals(messageBody),
    cognitive_bias_leverage: detectCognitiveBiases(messageBody),
    objection_preemption_style: detectObjectionPreemption(messageBody),
    trust_building_method: detectTrustBuilding(messageBody),
    urgency_creation_type: detectUrgencyCreation(messageBody),
    social_proof_style: detectSocialProof(messageBody),
    authority_positioning: detectAuthorityPositioning(messageBody),
    reciprocity_trigger: detectReciprocityTriggers(messageBody),
    commitment_escalation: detectCommitmentEscalation(messageBody),
    
    // Context-aware analysis
    personality_match_score: calculatePersonalityAlignment(messageBody, leadPsychProfile),
    emotional_intelligence_score: calculateEmotionalIntelligence(messageBody),
    persuasion_technique_density: calculatePersuasionDensity(messageBody)
  };
}

/**
 * Detect psychological techniques in messages
 */
function detectPsychologicalTechniques(message: string): string {
  const techniques = [];
  
  // Cialdini's 6 Principles of Persuasion
  if (/help.*you|assist.*with|support.*your|do.*for you/i.test(message)) {
    techniques.push('reciprocity');
  }
  if (/you mentioned|as you said|you agreed|makes sense.*right/i.test(message)) {
    techniques.push('commitment_consistency');
  }
  if (/others.*like you|clients.*similar|companies.*your size|most.*choose/i.test(message)) {
    techniques.push('social_proof');
  }
  if (/experts.*say|proven.*results|certified|award.*winning/i.test(message)) {
    techniques.push('authority');
  }
  if (/I understand|similar.*situation|appreciate.*your|respect.*that/i.test(message)) {
    techniques.push('liking_rapport');
  }
  if (/limited.*time|only.*few|exclusive|before.*deadline/i.test(message)) {
    techniques.push('scarcity');
  }
  
  // Advanced psychological techniques
  if (/missing.*out|cost.*of.*waiting|losing.*opportunity/i.test(message)) {
    techniques.push('loss_aversion');
  }
  if (/imagine.*when|think.*about.*future|picture.*yourself/i.test(message)) {
    techniques.push('future_pacing');
  }
  if (/compared.*to|versus|instead.*of|rather.*than/i.test(message)) {
    techniques.push('contrast_principle');
  }
  if (/typically.*costs|most.*pay|usually.*around|starting.*at/i.test(message)) {
    techniques.push('anchoring');
  }
  if (/because|reason.*why|here's.*why|the.*truth.*is/i.test(message)) {
    techniques.push('reason_why');
  }
  if (/what.*if|suppose|consider.*this|imagine.*if/i.test(message)) {
    techniques.push('hypothetical_scenario');
  }
  
  return techniques.length > 0 ? techniques.join(',') : 'none';
}

/**
 * Detect emotional appeals in messages
 */
function detectEmotionalAppeals(message: string): string {
  const appeals = [];
  
  if (/risk|danger|threat|problem|issue|concern|worry/i.test(message)) {
    appeals.push('fear');
  }
  if (/save|profit|gain|benefit|advantage|opportunity|win/i.test(message)) {
    appeals.push('greed');
  }
  if (/successful|leader|achievement|recognition|status|elite/i.test(message)) {
    appeals.push('pride');
  }
  if (/team|community|group|others|together|belong/i.test(message)) {
    appeals.push('belonging');
  }
  if (/safe|secure|protected|guaranteed|reliable|certain/i.test(message)) {
    appeals.push('security');
  }
  if (/discover|learn|find out|reveal|secret|inside/i.test(message)) {
    appeals.push('curiosity');
  }
  if (/now|today|quickly|immediate|soon|deadline|urgent/i.test(message)) {
    appeals.push('urgency');
  }
  if (/easy|simple|stress-free|effortless|smooth|comfortable/i.test(message)) {
    appeals.push('relief');
  }
  
  return appeals.length > 0 ? appeals.join(',') : 'none';
}

/**
 * Detect cognitive biases being leveraged
 */
function detectCognitiveBiases(message: string): string {
  const biases = [];
  
  if (/first|initial|original|starting/i.test(message)) {
    biases.push('anchoring_bias');
  }
  if (/available|limited|few|running out/i.test(message)) {
    biases.push('availability_heuristic');
  }
  if (/others|most|everyone|typically|usually/i.test(message)) {
    biases.push('bandwagon_effect');
  }
  if (/free|bonus|extra|included|no.*cost/i.test(message)) {
    biases.push('zero_price_effect');
  }
  if (/lose|miss|gone|last.*chance/i.test(message)) {
    biases.push('loss_aversion');
  }
  if (/because|reason|proven|research|studies/i.test(message)) {
    biases.push('authority_bias');
  }
  
  return biases.length > 0 ? biases.join(',') : 'none';
}

/**
 * Detect objection preemption styles
 */
function detectObjectionPreemption(message: string): string {
  if (/I know.*thinking|probably.*wondering|might.*be.*concerned/i.test(message)) {
    return 'anticipatory_addressing';
  }
  if (/common.*question|others.*ask|frequently.*hear/i.test(message)) {
    return 'social_normalization';
  }
  if (/understand.*if|makes.*sense.*if|natural.*to/i.test(message)) {
    return 'validation_preemption';
  }
  if (/before.*you.*say|let.*me.*address|want.*to.*clarify/i.test(message)) {
    return 'direct_preemption';
  }
  
  return 'none';
}

/**
 * Detect trust building methods
 */
function detectTrustBuilding(message: string): string {
  const methods = [];
  
  if (/client|customer|helped|worked.*with/i.test(message)) {
    methods.push('case_study');
  }
  if (/guarantee|promise|ensure|committed/i.test(message)) {
    methods.push('guarantee');
  }
  if (/transparent|honest|upfront|directly/i.test(message)) {
    methods.push('transparency');
  }
  if (/understand|appreciate|respect|realize/i.test(message)) {
    methods.push('empathy');
  }
  if (/experience|years|expertise|specialized/i.test(message)) {
    methods.push('credibility');
  }
  if (/testimonial|review|feedback|recommendation/i.test(message)) {
    methods.push('social_proof');
  }
  
  return methods.length > 0 ? methods.join(',') : 'none';
}

/**
 * Detect urgency creation types
 */
function detectUrgencyCreation(message: string): string {
  if (/deadline|expires|ends|closing/i.test(message)) {
    return 'time_deadline';
  }
  if (/limited|only.*left|few.*remaining/i.test(message)) {
    return 'quantity_scarcity';
  }
  if (/price.*going.*up|increasing|won't.*last/i.test(message)) {
    return 'price_increase';
  }
  if (/opportunity|window|chance.*now/i.test(message)) {
    return 'opportunity_window';
  }
  if (/others.*interested|competition|moving.*fast/i.test(message)) {
    return 'competitive_pressure';
  }
  
  return 'none';
}

/**
 * Detect social proof styles
 */
function detectSocialProof(message: string): string {
  if (/client|customer|helped|worked.*with/i.test(message)) {
    return 'case_study';
  }
  if (/testimonial|review|rating|feedback/i.test(message)) {
    return 'testimonials';
  }
  if (/others|most|everyone|many/i.test(message)) {
    return 'wisdom_of_crowds';
  }
  if (/expert|celebrity|influencer|known/i.test(message)) {
    return 'celebrity';
  }
  
  return 'none';
}

/**
 * Detect authority positioning
 */
function detectAuthorityPositioning(message: string): string {
  if (/expert|specialist|authority|leader/i.test(message)) {
    return 'expertise';
  }
  if (/certified|licensed|accredited|qualified/i.test(message)) {
    return 'credentials';
  }
  if (/years|experience|decades|established/i.test(message)) {
    return 'experience';
  }
  if (/award|recognition|featured|published/i.test(message)) {
    return 'recognition';
  }
  
  return 'none';
}

/**
 * Detect reciprocity triggers
 */
function detectReciprocityTriggers(message: string): string {
  if (/help.*you|assist.*with|support.*your/i.test(message)) {
    return 'help_offer';
  }
  if (/free|complimentary|no.*charge|gift/i.test(message)) {
    return 'free_value';
  }
  if (/share|provide|give.*you|offer/i.test(message)) {
    return 'information_sharing';
  }
  if (/save.*you|benefit.*you|advantage/i.test(message)) {
    return 'benefit_focus';
  }
  
  return 'none';
}

/**
 * Detect commitment escalation
 */
function detectCommitmentEscalation(message: string): string {
  if (/agree|confirm|commit|promise/i.test(message)) {
    return 'direct_commitment';
  }
  if (/makes sense|sound good|fair|reasonable/i.test(message)) {
    return 'agreement_seeking';
  }
  if (/next step|move forward|proceed|continue/i.test(message)) {
    return 'progression_request';
  }
  if (/ready|prepared|willing|interested/i.test(message)) {
    return 'readiness_confirmation';
  }
  
  return 'none';
}

/**
 * Calculate personality alignment score
 */
function calculatePersonalityAlignment(messageBody: string, leadPsychProfile: any): number {
  if (!leadPsychProfile) return 0.5;
  
  const techniques = detectPsychologicalTechniques(messageBody);
  const appeals = detectEmotionalAppeals(messageBody);
  
  // High skepticism needs social proof and authority
  if ((leadPsychProfile.personality_skepticism_score || 0) > 60) {
    if (techniques.includes('social_proof') || techniques.includes('authority')) {
      return 0.85;
    }
  }
  
  // High decisiveness responds to urgency and scarcity
  if ((leadPsychProfile.personality_decisiveness_score || 0) > 70) {
    if (appeals.includes('urgency') || techniques.includes('scarcity')) {
      return 0.90;
    }
  }
  
  // Low motivation needs emotional appeals
  if ((leadPsychProfile.motivation_score || 0) < 40) {
    if (appeals.includes('fear') || appeals.includes('greed')) {
      return 0.80;
    }
  }
  
  return 0.60; // Default moderate alignment
}

/**
 * Calculate emotional intelligence score
 */
function calculateEmotionalIntelligence(messageBody: string): number {
  const empathyWords = /understand|feel|appreciate|realize|respect|acknowledge/gi;
  const matches = (messageBody.match(empathyWords) || []).length;
  return Math.min(matches * 0.25, 1.0);
}

/**
 * Calculate persuasion technique density
 */
function calculatePersuasionDensity(messageBody: string): number {
  const techniques = detectPsychologicalTechniques(messageBody);
  const appeals = detectEmotionalAppeals(messageBody);
  const totalTechniques = (techniques !== 'none' ? techniques.split(',').length : 0) +
                         (appeals !== 'none' ? appeals.split(',').length : 0);
  return Math.min(totalTechniques / (messageBody.length / 100), 1.0);
}

/**
 * Detect objections in incoming messages
 */
function detectObjection(message: string): any {
  const lowerMessage = message.toLowerCase();
  
  if (/too.*expensive|cost.*too.*much|budget|price/i.test(message)) {
    return { type: 'price', emotional_tone: 'concerned' };
  }
  if (/not.*right.*time|busy|later|timing/i.test(message)) {
    return { type: 'timing', emotional_tone: 'hesitant' };
  }
  if (/need.*to.*think|discuss.*with|talk.*to/i.test(message)) {
    return { type: 'authority', emotional_tone: 'cautious' };
  }
  if (/don't.*need|already.*have|satisfied.*with/i.test(message)) {
    return { type: 'need', emotional_tone: 'dismissive' };
  }
  if (/not.*sure|uncertain|doubt|skeptical/i.test(message)) {
    return { type: 'trust', emotional_tone: 'skeptical' };
  }
  
  return null;
}

/**
 * Enhanced personality categorization with psychological depth
 */
function categorizeAdvancedPersonality(leadScore: any, messages: any[] = []): any {
  const basicPersonality = categorizePersonality(leadScore);
  
  return {
    ...basicPersonality,
    decision_style: categorizeDecisionStyle(leadScore),
    trust_building_speed: categorizeTrustSpeed(leadScore),
    information_processing: categorizeInfoProcessing(leadScore, messages),
    emotional_responsiveness: categorizeEmotionalResponse(leadScore),
    objection_style: categorizeObjectionStyle(messages),
    engagement_preference: categorizeEngagementStyle(messages)
  };
}

/**
 * Categorize decision-making style
 */
function categorizeDecisionStyle(leadScore: any): string {
  const decisiveness = leadScore.personality_decisiveness_score || 50;
  const skepticism = leadScore.personality_skepticism_score || 50;
  
  if (decisiveness > 70 && skepticism < 40) return 'quick_decisive';
  if (decisiveness > 70 && skepticism > 60) return 'decisive_but_cautious';
  if (decisiveness < 40 && skepticism < 40) return 'trusting_but_slow';
  if (decisiveness < 40 && skepticism > 60) return 'analytical_skeptical';
  if (decisiveness > 50 && skepticism < 60) return 'confident_moderate';
  return 'balanced_moderate';
}

/**
 * Categorize trust building speed
 */
function categorizeTrustSpeed(leadScore: any): string {
  const skepticism = leadScore.personality_skepticism_score || 50;
  const engagement = leadScore.engagement_curve || 50;
  
  if (skepticism < 30 && engagement > 60) return 'fast_trusting';
  if (skepticism < 50 && engagement > 40) return 'moderate_trusting';
  if (skepticism > 70 || engagement < 30) return 'slow_cautious';
  return 'average_trust_building';
}

/**
 * Categorize information processing style
 */
function categorizeInfoProcessing(leadScore: any, messages: any[]): string {
  if (!messages || messages.length === 0) return 'balanced_processing';
  
  const inboundMessages = messages.filter((m: any) => m.direction === 'inbound');
  if (inboundMessages.length === 0) return 'balanced_processing';
  
  const avgMessageLength = inboundMessages
    .reduce((sum: number, m: any) => sum + (m.message_body?.length || 0), 0) / inboundMessages.length;
  
  const questionCount = inboundMessages
    .reduce((sum: number, m: any) => sum + ((m.message_body?.match(/\?/g) || []).length), 0);
  
  if (avgMessageLength > 100 && questionCount > 3) return 'detail_oriented_analytical';
  if (avgMessageLength < 50 && questionCount < 2) return 'quick_overview_preferred';
  if (questionCount > 2) return 'inquisitive_thorough';
  return 'balanced_processing';
}

/**
 * Categorize emotional responsiveness
 */
function categorizeEmotionalResponse(leadScore: any): string {
  const sentiment = leadScore.sentiment_score || 0;
  const engagement = leadScore.engagement_curve || 50;
  const motivation = leadScore.motivation_score || 50;
  
  const emotionalIndex = (sentiment * 50) + engagement + motivation;
  
  if (emotionalIndex > 120) return 'highly_emotional_responsive';
  if (emotionalIndex > 80) return 'moderately_emotional';
  if (emotionalIndex < 40) return 'logic_focused_low_emotion';
  return 'balanced_emotional_logical';
}

/**
 * Categorize objection style (simplified for now)
 */
function categorizeObjectionStyle(messages: any[]): string {
  return 'moderate_objections';
}

/**
 * Categorize engagement style (simplified for now)  
 */
function categorizeEngagementStyle(messages: any[]): string {
  return 'moderate_engagement';
}




// ==========================================
// 🚀 MAIN SERVE FUNCTION
// ==========================================

serve(async (req) => {
 if (req.method === 'OPTIONS') {
   return new Response('ok', { headers: corsHeaders });
 }

 const requestStartTime = Date.now();
 let timingMetrics = {
   openai_response_time_ms: null,
   vector_search_time_ms: null,
   total_request_time_ms: null
 };

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

   // ✅ NEW: Fetch campaign metadata
   console.log('📊 Fetching campaign metadata...');
   const { data: campaign, error: campaignError } = await supabase
     .from("campaigns")
     .select("talk_track, service_type, vehicle_type")
     .eq("id", campaignId)
     .single();

   if (campaignError) {
     console.error('❌ Error fetching campaign metadata:', campaignError);
   }

   const campaignMetadata = {
     talk_track: campaign?.talk_track,
     service_type: campaign?.service_type,
     vehicle_type: campaign?.vehicle_type
   };

   console.log('📊 Campaign metadata:', campaignMetadata);

   // ✅ NEW: Get tenant's industry setting
   const { data: tenantSettings } = await supabase
     .from("tenants")
     .select("industry")
     .eq("id", tenant_id)
     .single();

   const tenantIndustry = tenantSettings?.industry || '';
   console.log('🏢 Tenant industry:', tenantIndustry);

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
   let systemInstructions = settings.value; // Raw instructions for system message

   // ✅ NEW: Get optimized tone based on plan and learning
   console.log('🎯 Getting optimized tone based on plan and learning...');
   // Get the current lead's psychological profile for personalization
const { data: currentLeadScore } = await supabase
  .from('lead_scores')
  .select('personality_decisiveness_score, personality_skepticism_score, motivation_score, hesitation_score, urgency_score')
  .eq('lead_id', lead_id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const optimizedApproach = await getOptimizedApproach(supabase, tenant_id, currentLeadScore);
console.log(`🎯 Optimized approach selected:`, optimizedApproach);

// ✅ ENHANCED: Apply optimized approach to system instructions
if (optimizedApproach.tone !== 'Friendly & Casual' || optimizedApproach.psychologicalTechniques.length > 0) {
  let toneDescription = '';
  
  // Build tone description
  if (optimizedApproach.tone === 'Direct Closer') {
    toneDescription = "You are selling. Be firm and clear. Use bold action language like Let's make this happen today or This is your best shot. Eliminate hesitation.";
  } else if (optimizedApproach.tone === 'Soft & Trust-Building') {
    toneDescription = "Use a gentle, trust-building approach. Ask questions, listen actively, and build rapport before making any suggestions. Prioritize relationship over immediate conversion.";
  }

  // Add psychological techniques if learned
  if (optimizedApproach.psychologicalTechniques.length > 0) {
    const techniqueDescriptions = optimizedApproach.psychologicalTechniques.map(technique => {
      switch(technique) {
        case 'social_proof': return 'Use social proof (others like you, clients similar to you)';
        case 'scarcity': return 'Create urgency with scarcity (limited time, few spots left)';
        case 'authority': return 'Reference expertise and credentials';
        case 'reciprocity': return 'Offer value first, then ask';
        case 'loss_aversion': return 'Highlight what they might miss out on';
        default: return `Use ${technique} technique`;
      }
    });
    
    toneDescription += `\n\nPSYCHOLOGICAL TECHNIQUES: Based on learning from ${optimizedApproach.confidence * 100}% confidence, use these approaches:\n- ${techniqueDescriptions.join('\n- ')}`;
  }

  // Inject the optimized approach into system instructions
  const toneBlock = `TONE: ${optimizedApproach.tone}\n${toneDescription}`;
  
  // Replace existing tone section or add it
  if (systemInstructions.includes('TONE:')) {
    systemInstructions = systemInstructions.replace(/TONE:.*?(?=\n\n|\n[A-Z]|$)/s, toneBlock);
  } else {
    systemInstructions = `${toneBlock}\n\n${systemInstructions}`;
  }
  
  console.log('✅ System instructions updated with optimized approach and psychological techniques');
}

// Keep the optimizedTone variable for backward compatibility
const optimizedTone = optimizedApproach.tone;

   // ✅ NEW: Generate campaign strategy based on metadata
   const campaignStrategy = getCampaignStrategy(tenantIndustry, campaignMetadata);
   
   // Add campaign strategy section if we have one
   if (campaignStrategy) {
     systemInstructions = systemInstructions.replace(
       '=== CAMPAIGN STRATEGY ===',
       `=== CAMPAIGN STRATEGY ===\n${campaignStrategy}`
     );
     
     // If the template doesn't have a campaign strategy section, add it
     if (!systemInstructions.includes('=== CAMPAIGN STRATEGY ===')) {
       systemInstructions += `\n\n=== CAMPAIGN STRATEGY ===\n${campaignStrategy}`;
     }
   }

   console.log('📋 Campaign strategy injected:', campaignStrategy);

   // ✅ CALL VECTOR SEARCH EDGE FUNCTION
   console.log('🔍 Searching for relevant knowledge chunks...');

   let knowledgeContext = '';
   const vectorSearchStartTime = Date.now();
   try {
     const vectorSearchUrl = `${supabaseUrl}/functions/v1/vector-search`;
     const vectorResponse = await fetch(vectorSearchUrl, {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${supabaseKey}`,
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         query: message_body,
         campaign_id: campaignId,
         tenant_id: tenant_id,
         match_count: 5
       })
     });

     if (vectorResponse.ok) {
       const vectorData = await vectorResponse.json();
       const chunks = vectorData.chunks || vectorData.data || [];
       
       if (chunks && chunks.length > 0) {
         console.log(`✅ Found ${chunks.length} relevant knowledge chunks`);

         // Format chunks for context
         knowledgeContext = '\n' + chunks
           .map((chunk: any, idx: number) => `Context ${idx + 1} (${Math.round(chunk.similarity * 100)}% relevant):\n${chunk.chunk_text}`)
           .join('\n\n');
       } else {
         if (vectorData.message) {
           console.log(`⚠️ No relevant knowledge chunks found - message from vector-search: ${vectorData.message}`);
         } else {
           console.log('⚠️ No relevant knowledge chunks found');
         }
       }
     } else {
       const errorText = await vectorResponse.text();
       console.error('❌ Vector search failed:', vectorResponse.status, errorText);
     }
   } catch (vectorError) {
     console.error('❌ Error calling vector search:', vectorError);
     // Continue without knowledge context rather than failing
   }
   timingMetrics.vector_search_time_ms = Date.now() - vectorSearchStartTime;

   // Inject knowledge into system instructions if found
   if (knowledgeContext) {
     systemInstructions = systemInstructions.replace(
       '=== KNOWLEDGE BASE ===',
       `=== KNOWLEDGE BASE ===\n${knowledgeContext}`
     );
     console.log('✅ Knowledge context injected into system instructions');
   } else {
     console.log('⚠️ No knowledge context added to system instructions');
   }

   // ✅ NEW: Create lead details block for USER message
   console.log('📋 Building lead details for user context...');
   const leadDetailsBlock = generateLeadDetailsBlock(lead, fieldConfig || []);
   
   console.log('📋 Lead details block created:', leadDetailsBlock.substring(0, 200) + '...');

   // ✅ NEW: Separate SYSTEM and USER messages
   const systemMessage = `NEVER use the lead's name. NEVER say "folks". NEVER start with "Hey [name]".

${systemInstructions.replace('{{LEAD_DETAILS_PLACEHOLDER}}', '')}

FINAL REMINDER: Your response must NOT contain the lead's name anywhere.`; // Pure instructions

   const userMessage = `CONVERSATION HISTORY:
${formattedHistory}

${leadDetailsBlock}

CURRENT MESSAGE: ${message_body}`;

   console.log('🔍 SYSTEM MESSAGE CONTENT (first 500 chars):', systemMessage.substring(0, 500));
   console.log('🔍 System message contains campaign strategy:', systemMessage.includes(campaignStrategy));
   console.log('🔍 System message total length:', systemMessage.length);

   if (!openaiApiKey) {
     console.error('❌ OpenAI API key not available');
     return new Response('OpenAI API key not configured', { status: 500 });
   }

   console.log('🤖 Calling OpenAI with SYSTEM + USER message architecture...');
   console.log('📋 System message length:', systemMessage.length, 'characters');
   console.log('📋 User message length:', userMessage.length, 'characters');
   
   const openaiStartTime = Date.now();
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
   timingMetrics.openai_response_time_ms = Date.now() - openaiStartTime;

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

   // ✅ NEW: Extract timing preferences from the conversation
   console.log('📅 Checking for timing preferences in message...');
   const timingAnalysisPrompt = `
Analyze this message and the conversation context to determine the optimal follow-up timing.

MESSAGE: ${message_body}
LEAD STATUS: Processing (will be determined by scoring)
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
       const rawContent = timingResult.choices[0].message.content;
let timingData;
try {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch ? jsonMatch[0] : rawContent;
  timingData = JSON.parse(jsonString);
} catch (parseError) {
  console.error('❌ Failed to parse timing analysis JSON:', parseError);
  console.log('🔍 Raw timing response:', rawContent);
  timingData = null;
}

       if (timingData && timingData.TIMING_FOUND) {
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
       conversation_history: updatedConversationHistory,
       ai_tone_used: optimizedTone // ✅ NEW: Track which tone was used
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
     conversation_history: finalConversationHistory,
     ai_tone_used: optimizedTone // ✅ NEW: Track which tone was used
   }).select('id');

   if (insertError || !insertedMessage || insertedMessage.length === 0) {
     console.error('❌ Failed to insert AI response:', insertError);
     return new Response('Failed to save AI response', { status: 500 });
   }

   const insertedMessageId = insertedMessage[0].id;

     const tenantPlan = await getTenantPlan(supabase, tenant_id);
     const conversationLimit = getFeatureValue(tenantPlan, 'conversationMemory');

  // 🧠 TRIGGER AI LEARNING ENGINE (FIXED)
console.log('🧠 Triggering ai-learning-engine...');
try {
  if (conversationLimit > 0) { // Only learn if not on starter plan
    console.log('🧠 Plan allows learning - calling ai-learning-engine...');
    
    const learningUrl = `${supabaseUrl}/functions/v1/ai-learning-engine`;
    const learningResponse = await fetch(learningUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'full_analysis',
        message_id: insertedMessageId,
        lead_id: lead_id,
        tenant_id: tenant_id,
        response_data: {
          responded: true,
          sentiment: sentiment.score
        }
      })
    });

    if (learningResponse.ok) {
      const learningResult = await learningResponse.json();
      console.log('✅ AI learning engine completed:', learningResult);
    } else {
      console.error('❌ AI learning engine failed:', learningResponse.status);
    }
    
    console.log('✅ Learning analytics completed');
  } else {
    console.log('⚠️ Starter plan - skipping learning analytics');
  }
} catch (learningError) {
  console.error('❌ Error in learning analytics:', learningError);
  // Don't fail the main request if learning fails
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
     
     const nextBusinessHour = getNextBusinessHour(businessTime, openHour, officeDays, settingsMap.timezone);
     console.log(`📅 Message will be sent at: ${nextBusinessHour.toLocaleString()}`);
     
     // Update the message with scheduled send time
     await supabase.from('messages')
       .update({
         business_hours_hold: true,
         scheduled_response_time: nextBusinessHour.toISOString()
       })
       .eq('id', insertedMessageId);
     
     console.log('✅ Message queued for business hours delivery');
     return new Response(
       JSON.stringify({
         success: true,
         message: 'Message received and queued for business hours response',
         scheduled_time: nextBusinessHour.toLocaleString(),
         analysis: {
           weighted_score,
           status: lead.status, // Will be updated by score-lead function
           optimized_tone: optimizedTone,
           learning_enabled: conversationLimit > 0
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
    statusCallback: `${supabaseUrl}/functions/v1/twilio-status-webhook`, // ✅ ADD THIS LINE
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
             .eq('id', insertedMessageId);
         }
       } catch (twilioErr) {
         console.error('❌ Error calling Twilio API:', twilioErr);
       }
     }
   }

   console.log('✅ AI analysis complete, response sent with optimized tone:', optimizedTone);
   console.log('🧠 Learning system active:', conversationLimit > 0 ? 'YES' : 'NO (Starter Plan)');
   
   // Log timing metrics
   timingMetrics.total_request_time_ms = Date.now() - requestStartTime;
   
   try {
     await supabase.from('ai_timing_metrics').insert({
       tenant_id,
       lead_id,
       message_id: insertedMessageId,
       request_start_time: new Date(requestStartTime).toISOString(),
       openai_response_time_ms: timingMetrics.openai_response_time_ms,
       vector_search_time_ms: timingMetrics.vector_search_time_ms,
       total_request_time_ms: timingMetrics.total_request_time_ms,
       request_type: 'conversation',
       ai_model_used: 'gpt-4o',
       success: true
     });
     console.log('✅ Timing metrics logged:', timingMetrics);
   } catch (timingError) {
     console.error('❌ Failed to log timing metrics:', timingError);
   }

   return new Response(
     JSON.stringify({
       success: true,
       message: 'AI analysis processed successfully',
       analysis: {
         weighted_score,
         status: lead.status, // Will be updated by score-lead function
         optimized_tone: optimizedTone,
         learning_enabled: conversationLimit > 0,
         psychological_impact: {
           motivation: parsed.motivation,
           hesitation: parsed.hesitation,
           urgency: parsed.urgency,
           sentiment: sentiment.score
         }
       }
     }), 
     { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
   );

 } catch (err) {
   console.error('❗ Unexpected error:', err);
   return new Response('Unexpected server error', { status: 500 });
 }
});