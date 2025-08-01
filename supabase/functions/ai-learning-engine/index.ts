import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// 🆕 ADD THIS FUNCTION HERE (at the top level):
function calculateConversationSuccess(beforeScore, afterScore, responseData) {
  let successScore = 0;
  
  // 🥇 PRIMARY SUCCESS: Did they become HOT? (70% of total score)
  if (afterScore.requires_immediate_attention && !beforeScore.requires_immediate_attention) {
    successScore += 70; // JACKPOT - This is what we really want!
  }
  
  // 🥈 PATHWAY SUCCESS: Psychological improvements that lead to HOT (30% of total score)
  const motivationGain = Math.max(0, (afterScore.motivation_score || 0) - (beforeScore.motivation_score || 0));
  const hesitationReduction = Math.max(0, (beforeScore.hesitation_score || 0) - (afterScore.hesitation_score || 0));
  const urgencyGain = Math.max(0, (afterScore.urgency_score || 0) - (beforeScore.urgency_score || 0));
  
  // Scale psychological improvements (max 30 points total)
  const psychScore = Math.min(30, 
    (motivationGain * 0.4) + 
    (hesitationReduction * 0.4) + 
    (urgencyGain * 0.2)
  );
  
  successScore += psychScore;
  
  return Math.min(successScore, 100);
}

// ==========================================
// 🧠 ENHANCED LEARNING ENGINE FUNCTIONS
// ==========================================

/**
 * Enhanced message psychology analysis with deep psychological insights
 */
async function analyzeMessagePsychology(supabase, tenantId, messageId, responseData) {
  try {
    console.log('🧠 Analyzing message psychology for learning...');
    
    // Get the message and its psychological impact
    const { data: message } = await supabase.from('messages').select('message_body, direction, lead_id, ai_tone_used').eq('id', messageId).single();
    if (!message || message.direction !== 'outbound') return;
    
    // Get before/after psychological scores
    const { data: beforeScores } = await supabase.from('lead_scores').select('*').eq('lead_id', message.lead_id).order('updated_at', {
      ascending: false
    }).limit(2);
    
    if (!beforeScores || beforeScores.length < 2) {
      console.log(`❌ LEARNING BLOCKED: Only ${beforeScores?.length || 0} lead_scores found for lead ${message.lead_id} - need at least 2 for comparison`);
      return;
    }
    
    const [current, previous] = beforeScores;
    
    // Extract advanced message components with psychological analysis
    const messageComponents = extractAdvancedMessageComponents(message.message_body, current);
    
    // Calculate psychological impact
    const psychologicalImpact = {
      decisiveness_change: (current.personality_decisiveness_score || 50) - (previous.personality_decisiveness_score || 50),
      skepticism_change: (current.personality_skepticism_score || 50) - (previous.personality_skepticism_score || 50),
      motivation_change: (current.motivation_score || 50) - (previous.motivation_score || 50),
      hesitation_change: (previous.hesitation_score || 50) - (current.hesitation_score || 50),
      urgency_change: (current.urgency_score || 50) - (previous.urgency_score || 50),
      engagement_change: (current.engagement_curve || 50) - (previous.engagement_curve || 50)
    };
    
    // Calculate advanced psychological effectiveness
    const psychEffectiveness = calculatePsychologicalEffectiveness(psychologicalImpact, messageComponents);
    
    // Calculate conversation success score
    const conversationSuccess = calculateConversationSuccess(previous, current, responseData);

    // Store enhanced learning data
    // 🆕 AGGREGATION LOGIC - REPLACE ENTIRE UPSERT BLOCK WITH THIS
    const patternHash = hashMessage(messageComponents);
    console.log(`🔍 Generated pattern hash: ${patternHash}`);
    console.log(`🔍 Conversation success score: ${conversationSuccess}`);

    // Check if pattern already exists
    const { data: existingPattern } = await supabase
      .from('message_psychology_analytics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('message_pattern_hash', patternHash)
      .maybeSingle();

    if (existingPattern) {
      // AGGREGATE with existing data
      const newSampleSize = existingPattern.sample_size + 1;
      const newWeight = 1 / newSampleSize;
      const oldWeight = (newSampleSize - 1) / newSampleSize;
      
      await supabase.from('message_psychology_analytics').update({
        // Aggregate effectiveness scores
        psychological_effectiveness_score: (existingPattern.psychological_effectiveness_score * oldWeight) + (psychEffectiveness.overall_score * newWeight),
        emotional_resonance_score: (existingPattern.emotional_resonance_score * oldWeight) + (psychEffectiveness.emotional_resonance * newWeight),
        trust_building_effectiveness: (existingPattern.trust_building_effectiveness * oldWeight) + (psychEffectiveness.trust_building * newWeight),
        objection_prevention_score: (existingPattern.objection_prevention_score * oldWeight) + (psychEffectiveness.objection_prevention * newWeight),
        action_motivation_score: (existingPattern.action_motivation_score * oldWeight) + (psychEffectiveness.action_motivation * newWeight),
        
        // Aggregate psychological impacts
        avg_decisiveness_change: (existingPattern.avg_decisiveness_change * oldWeight) + (psychologicalImpact.decisiveness_change * newWeight),
        avg_skepticism_change: (existingPattern.avg_skepticism_change * oldWeight) + (psychologicalImpact.skepticism_change * newWeight),
        avg_motivation_increase: (existingPattern.avg_motivation_increase * oldWeight) + (psychologicalImpact.motivation_change * newWeight),
        avg_hesitation_decrease: (existingPattern.avg_hesitation_decrease * oldWeight) + (psychologicalImpact.hesitation_change * newWeight),
        avg_urgency_boost: (existingPattern.avg_urgency_boost * oldWeight) + (psychologicalImpact.urgency_change * newWeight),
        avg_engagement_improvement: (existingPattern.avg_engagement_improvement * oldWeight) + (psychologicalImpact.engagement_change * newWeight),
        
        // Aggregate response rates
        response_rate: (existingPattern.response_rate * oldWeight) + ((responseData.responded ? 1 : 0) * newWeight),
        positive_sentiment_rate: (existingPattern.positive_sentiment_rate * oldWeight) + ((psychologicalImpact.engagement_change > 0 ? 1 : 0) * newWeight),
        progression_rate: (existingPattern.progression_rate * oldWeight) + ((psychologicalImpact.motivation_change > 0 ? 1 : 0) * newWeight),
        escalation_rate: (existingPattern.escalation_rate * oldWeight) + ((psychologicalImpact.urgency_change > 5 ? 1 : 0) * newWeight),
        
        // Update metadata
        sample_size: newSampleSize,
        confidence_level: Math.min(0.95, 0.4 + (newSampleSize * 0.02)),
        conversation_success_score: (existingPattern.conversation_success_score * oldWeight) + (conversationSuccess * newWeight),
        statistical_significance: newSampleSize >= 10,
        updated_at: new Date().toISOString()
      }).eq('id', existingPattern.id);
      
      console.log(`📊 Aggregated pattern ${patternHash}: sample_size=${newSampleSize}, confidence=${Math.min(0.95, 0.4 + (newSampleSize * 0.02)).toFixed(2)}`);
      
    } else {
      // CREATE new pattern
      console.log(`🔍 About to insert new pattern...`);
      
      const insertData = {
        tenant_id: tenantId,
        message_pattern_hash: patternHash,
        
        // Basic components
        opening_type: messageComponents.opening_type,
        question_style: messageComponents.question_style,
        tone_approach: messageComponents.tone_approach,
        value_prop_type: messageComponents.value_prop_type,
        cta_style: messageComponents.cta_style,
        
        // Enhanced psychological components
        psychological_technique: messageComponents.psychological_technique,
        emotional_appeal_type: messageComponents.emotional_appeal_type,
        cognitive_bias_leverage: messageComponents.cognitive_bias_leverage,
        objection_preemption_style: messageComponents.objection_preemption_style,
        trust_building_method: messageComponents.trust_building_method,
        urgency_creation_type: messageComponents.urgency_creation_type,
        social_proof_style: messageComponents.social_proof_style,
        authority_positioning: messageComponents.authority_positioning,
        reciprocity_trigger: messageComponents.reciprocity_trigger,
        commitment_escalation: messageComponents.commitment_escalation,
        
        // Initial measurements
        psychological_effectiveness_score: psychEffectiveness.overall_score,
        emotional_resonance_score: psychEffectiveness.emotional_resonance,
        trust_building_effectiveness: psychEffectiveness.trust_building,
        objection_prevention_score: psychEffectiveness.objection_prevention,
        action_motivation_score: psychEffectiveness.action_motivation,
        
        avg_decisiveness_change: psychologicalImpact.decisiveness_change,
        avg_skepticism_change: psychologicalImpact.skepticism_change,
        avg_motivation_increase: psychologicalImpact.motivation_change,
        avg_hesitation_decrease: psychologicalImpact.hesitation_change,
        avg_urgency_boost: psychologicalImpact.urgency_change,
        avg_engagement_improvement: psychologicalImpact.engagement_change,
        
        response_rate: responseData.responded ? 1 : 0,
        positive_sentiment_rate: psychologicalImpact.engagement_change > 0 ? 1 : 0,
        progression_rate: psychologicalImpact.motivation_change > 0 ? 1 : 0,
        escalation_rate: psychologicalImpact.urgency_change > 5 ? 1 : 0,
        
        sample_size: 1,
        confidence_level: 0.4,
        conversation_success_score: conversationSuccess,
        statistical_significance: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`🔍 Insert data:`, JSON.stringify(insertData, null, 2));
      
      const { data, error } = await supabase.from('message_psychology_analytics').insert(insertData);
      
      console.log(`🔍 Insert response - Data:`, data);
      console.log(`🔍 Insert response - Error:`, error);
      
      if (error) {
        console.error(`❌ REAL INSERT ERROR:`, error);
      } else {
        console.log(`✅ Insert actually succeeded`);
      }
    }
    
    console.log('📊 Enhanced psychological learning data captured:', messageComponents.psychological_technique);
  } catch (error) {
    console.error('Error analyzing message psychology:', error);
  }
}

/**
 * Enhanced personality pattern learning with psychological profiling
 */
async function learnPersonalityPatterns(supabase, tenantId, leadId) {
  try {
    console.log('🧠 Learning enhanced personality patterns...');
    
    // Get lead's current psychological profile
    const { data: leadScore } = await supabase.from('lead_scores').select('*').eq('lead_id', leadId).order('updated_at', {
      ascending: false
    }).limit(1).single();
    if (!leadScore) return;
    
    // Get full conversation history for psychological analysis
    const { data: messages } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('timestamp');
    if (!messages) return;
    
    // Enhanced personality clustering with psychological depth
    const psychProfile = categorizeAdvancedPersonality(leadScore, messages);
    
    // Analyze conversation effectiveness with psychological insights
    const conversationMetrics = analyzeAdvancedConversationMetrics(messages, leadScore);
    
    // Extract objection patterns and handling effectiveness
    const objectionPatterns = extractObjectionPatterns(messages);
    
    // Update enhanced personality pattern learning
    // 🆕 AGGREGATION LOGIC FOR PERSONALITY PATTERNS
    const personalityKey = `${psychProfile.decisiveness_range}_${psychProfile.skepticism_range}_${psychProfile.motivation_range}`;

    // Check if personality pattern already exists
    const { data: existingPersonality } = await supabase
      .from('personality_response_patterns')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('decisiveness_range', psychProfile.decisiveness_range)
      .eq('skepticism_range', psychProfile.skepticism_range)
      .eq('motivation_range', psychProfile.motivation_range)
      .maybeSingle();

    if (existingPersonality) {
      // AGGREGATE with existing personality data
      const newSampleSize = existingPersonality.sample_size + 1;
      const newWeight = 1 / newSampleSize;
      const oldWeight = (newSampleSize - 1) / newSampleSize;
      
      await supabase.from('personality_response_patterns').update({
        // Aggregate communication strategies
        optimal_message_length: Math.round((existingPersonality.optimal_message_length * oldWeight) + (conversationMetrics.avg_message_length * newWeight)),
        preferred_question_density: (existingPersonality.preferred_question_density * oldWeight) + (conversationMetrics.question_density * newWeight),
        optimal_followup_timing_hours: (existingPersonality.optimal_followup_timing_hours * oldWeight) + (conversationMetrics.avg_response_time_hours * newWeight),
        
        // Aggregate performance metrics
        avg_conversion_rate: (existingPersonality.avg_conversion_rate * oldWeight) + (conversationMetrics.conversion_rate * newWeight),
        avg_conversation_depth: (existingPersonality.avg_conversation_depth * oldWeight) + ((leadScore.conversation_depth || 1) * newWeight),
        avg_emotional_improvement: (existingPersonality.avg_emotional_improvement * oldWeight) + (conversationMetrics.sentiment_improvement * newWeight),
        avg_objection_resolution_rate: (existingPersonality.avg_objection_resolution_rate * oldWeight) + (objectionPatterns.resolution_rate * newWeight),
        avg_time_to_escalation_hours: (existingPersonality.avg_time_to_escalation_hours * oldWeight) + (conversationMetrics.time_to_escalation * newWeight),
        
        // Update sample size
        sample_size: newSampleSize,
        updated_at: new Date().toISOString()
      }).eq('id', existingPersonality.id);
      
      console.log(`🧠 Aggregated personality pattern ${personalityKey}: sample_size=${newSampleSize}`);
      
    } else {
      // CREATE new personality pattern
      await supabase.from('personality_response_patterns').insert({
        tenant_id: tenantId,
        
        // Enhanced personality clustering
        decisiveness_range: psychProfile.decisiveness_range,
        skepticism_range: psychProfile.skepticism_range,
        motivation_range: psychProfile.motivation_range,
        decision_style_cluster: psychProfile.decision_style,
        trust_speed_cluster: psychProfile.trust_building_speed,
        information_processing_style: psychProfile.information_processing,
        emotional_responsiveness_level: psychProfile.emotional_responsiveness,
        objection_tendency_pattern: psychProfile.objection_style,
        engagement_preference_type: psychProfile.engagement_preference,
        
        // Optimal communication strategies
        optimal_message_length: conversationMetrics.avg_message_length,
        preferred_question_density: conversationMetrics.question_density,
        best_tone_approach: conversationMetrics.most_effective_tone,
        optimal_followup_timing_hours: conversationMetrics.avg_response_time_hours,
        
        // Psychological approach preferences
        best_psychological_approach: conversationMetrics.most_effective_psychology,
        effective_objection_handling: objectionPatterns.most_effective_handling,
        preferred_trust_building: conversationMetrics.effective_trust_methods,
        ideal_emotional_progression: conversationMetrics.successful_emotional_arc,
        effective_urgency_creation: conversationMetrics.successful_urgency_techniques,
        
        // Behavioral triggers and responses
        objection_triggers: objectionPatterns.common_triggers,
        engagement_accelerators: conversationMetrics.engagement_accelerators,
        dropout_warning_signs: conversationMetrics.dropout_signals,
        conversion_readiness_signals: conversationMetrics.conversion_signals,
        
        // Performance metrics
        avg_conversion_rate: conversationMetrics.conversion_rate,
        avg_conversation_depth: leadScore.conversation_depth || 1,
        avg_emotional_improvement: conversationMetrics.sentiment_improvement,
        avg_objection_resolution_rate: objectionPatterns.resolution_rate,
        avg_time_to_escalation_hours: conversationMetrics.time_to_escalation,
        
        sample_size: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      
      console.log(`🧠 Created new personality pattern ${personalityKey}`);
    }
    
    console.log('🧠 Enhanced personality pattern learning updated for profile:', psychProfile.decision_style);
  } catch (error) {
    console.error('Error learning personality patterns:', error);
  }
}

/**
 * Enhanced conversation flow analysis with psychological journey mapping
 */
async function analyzeConversationFlow(supabase, tenantId, leadId) {
  try {
    console.log('🧠 Analyzing enhanced conversation flow...');
    
    // Get full conversation sequence with metadata
    const { data: messages } = await supabase.from('messages').select('*').eq('lead_id', leadId).order('timestamp');
    if (!messages || messages.length < 3) return;
    
    // Get psychological journey with score history
    const { data: scoreHistory } = await supabase.from('lead_scores').select('*').eq('lead_id', leadId).order('updated_at');
    
    // Enhanced conversation flow analysis
    const conversationFlow = extractAdvancedConversationFlow(messages, scoreHistory || []);
    
    // Map emotional and psychological journey
    const psychologicalJourney = mapPsychologicalJourney(messages, scoreHistory || []);
    
    // Identify critical conversation moments
    const criticalMoments = identifyCriticalMoments(messages, scoreHistory || []);
    
    // Get final outcome for effectiveness measurement
    const { data: finalScore } = await supabase.from('lead_scores').select('*').eq('lead_id', leadId).order('updated_at', {
      ascending: false
    }).limit(1).single();
    
    // Store enhanced flow learning
    // 🆕 CONVERSATION FLOW IS ALWAYS INSERT (each conversation is unique)
    // This one stays as insert because each conversation flow is unique
    await supabase.from('conversation_flow_patterns').insert({
      tenant_id: tenantId,
      lead_id: leadId, // Add this to track which lead
      
      // Basic flow data
      sequence_pattern: conversationFlow.sequence,
      conversation_stage: conversationFlow.stage,
      
      // Enhanced psychological journey data
      emotional_journey_map: psychologicalJourney.emotional_journey,
      trust_progression_pattern: psychologicalJourney.trust_progression,
      objection_resolution_sequence: psychologicalJourney.objection_sequence,
      engagement_escalation_pattern: psychologicalJourney.engagement_escalation,
      
      // Critical moment analysis
      breakthrough_moment_triggers: criticalMoments.breakthrough_moments,
      sticking_point_patterns: criticalMoments.sticking_points,
      conversion_catalyst_events: criticalMoments.conversion_catalysts,
      dropout_risk_indicators: criticalMoments.dropout_risks,
      
      // Psychological momentum tracking
      psychological_momentum_score: psychologicalJourney.momentum_score,
      emotional_peak_valley_pattern: psychologicalJourney.emotional_peaks_valleys,
      conversation_rhythm_analysis: psychologicalJourney.rhythm_analysis,
      
      // Traditional metrics
      sentiment_trajectory: psychologicalJourney.sentiment_changes,
      engagement_curve: psychologicalJourney.engagement_changes,
      psychological_shifts: psychologicalJourney.psychological_changes,
      
      // Effectiveness metrics
      completion_rate: conversationFlow.completion_rate,
      escalation_success_rate: finalScore?.requires_immediate_attention ? 1 : 0,
      avg_final_hot_score: finalScore?.hot_score || 0,
      emotional_improvement_rate: psychologicalJourney.emotional_improvement_rate,
      objection_resolution_rate: psychologicalJourney.objection_resolution_rate,
      psychological_progression_score: psychologicalJourney.progression_score,
      
      sample_size: 1,
      created_at: new Date().toISOString()
    });
    
    console.log('🔄 Enhanced conversation flow pattern captured');
  } catch (error) {
    console.error('Error analyzing conversation flow:', error);
  }
}

// ==========================================
// 🔧 ENHANCED HELPER FUNCTIONS
// ==========================================

/**
 * Extract advanced message components with psychological analysis
 */
function extractAdvancedMessageComponents(messageBody, leadPsychProfile) {
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
function detectPsychologicalTechniques(message) {
  const techniques = [];
  const lowerMessage = message.toLowerCase();
  
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
function detectEmotionalAppeals(message) {
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
function detectCognitiveBiases(message) {
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
function detectObjectionPreemption(message) {
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
function detectTrustBuilding(message) {
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
 * Detect social proof styles
 */
function detectSocialProof(message) {
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
function detectAuthorityPositioning(message) {
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
function detectReciprocityTriggers(message) {
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
function detectCommitmentEscalation(message) {
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
 * Detect urgency creation types
 */
function detectUrgencyCreation(message) {
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
 * Enhanced personality categorization with psychological depth
 */
function categorizeAdvancedPersonality(leadScore, messages) {
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
function categorizeDecisionStyle(leadScore) {
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
 * Categorize objection style
 */
function categorizeObjectionStyle(messages) {
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  let objectionCount = 0;
  let priceObjections = 0;
  let timingObjections = 0;
  
  inboundMessages.forEach(msg => {
    const objection = detectObjection(msg.message_body);
    if (objection) {
      objectionCount++;
      if (objection.type === 'price') priceObjections++;
      if (objection.type === 'timing') timingObjections++;
    }
  });
  
  if (objectionCount === 0) return 'low_objections';
  if (objectionCount >= 3) return 'high_objections';
  if (priceObjections > timingObjections) return 'price_focused_objections';
  if (timingObjections > priceObjections) return 'timing_focused_objections';
  return 'moderate_objections';
}

/**
 * Categorize engagement style
 */
function categorizeEngagementStyle(messages) {
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  
  if (inboundMessages.length === 0) return 'no_engagement';
  
  const avgMessageLength = inboundMessages
    .reduce((sum, m) => sum + (m.message_body?.length || 0), 0) / inboundMessages.length;
  
  const questionCount = inboundMessages
    .reduce((sum, m) => sum + ((m.message_body?.match(/\?/g) || []).length), 0);
  
  const responseSpeed = inboundMessages.length / Math.max(messages.length / 2, 1); // Rough response rate
  
  if (avgMessageLength > 100 && questionCount > 2) return 'highly_engaged_detailed';
  if (avgMessageLength < 30 && responseSpeed > 0.8) return 'quick_responsive';
  if (questionCount > inboundMessages.length * 0.3) return 'inquisitive_engagement';
  if (avgMessageLength > 50) return 'thoughtful_engagement';
  return 'moderate_engagement';
}

/**
 * Categorize trust building speed
 */
function categorizeTrustSpeed(leadScore) {
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
function categorizeInfoProcessing(leadScore, messages) {
  const avgMessageLength = messages
    .filter(m => m.direction === 'inbound')
    .reduce((sum, m) => sum + (m.message_body?.length || 0), 0) / 
    Math.max(messages.filter(m => m.direction === 'inbound').length, 1);
  
  const questionCount = messages
    .filter(m => m.direction === 'inbound')
    .reduce((sum, m) => sum + (m.message_body?.match(/\?/g) || []).length, 0);
  
  if (avgMessageLength > 100 && questionCount > 3) return 'detail_oriented_analytical';
  if (avgMessageLength < 50 && questionCount < 2) return 'quick_overview_preferred';
  if (questionCount > 2) return 'inquisitive_thorough';
  return 'balanced_processing';
}

/**
 * Categorize emotional responsiveness
 */
function categorizeEmotionalResponse(leadScore) {
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
 * Analyze advanced conversation metrics with psychological insights
 */
function analyzeAdvancedConversationMetrics(messages, leadScore) {
  const basicMetrics = analyzeConversationMetrics(messages);
  
  const outboundMessages = messages.filter(m => m.direction === 'outbound');
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  
  // Analyze psychological techniques effectiveness
  const psychTechniqueEffectiveness = {};
  outboundMessages.forEach((msg, index) => {
    const techniques = detectPsychologicalTechniques(msg.message_body).split(',');
    const nextResponse = inboundMessages.find(im => new Date(im.timestamp) > new Date(msg.timestamp));
    const effectiveness = nextResponse ? (nextResponse.sentiment_score || 0) : 0;
    
    techniques.forEach(tech => {
      if (tech !== 'none') {
        if (!psychTechniqueEffectiveness[tech]) psychTechniqueEffectiveness[tech] = [];
        psychTechniqueEffectiveness[tech].push(effectiveness);
      }
    });
  });
  
  const mostEffectivePsychology = Object.keys(psychTechniqueEffectiveness)
    .reduce((best, tech) => {
      const avgScore = psychTechniqueEffectiveness[tech].reduce((sum, score) => sum + score, 0) / 
                      psychTechniqueEffectiveness[tech].length;
      return avgScore > (psychTechniqueEffectiveness[best]?.[0] || 0) ? tech : best;
    }, 'none');
  
  // Analyze emotional progression
  const sentimentProgression = inboundMessages.map(m => m.sentiment_score || 0);
  const sentimentImprovement = sentimentProgression.length > 1 ? 
    sentimentProgression[sentimentProgression.length - 1] - sentimentProgression[0] : 0;
  
  // Identify engagement accelerators
  const engagementAccelerators = [];
  outboundMessages.forEach((msg, index) => {
    const emotional = detectEmotionalAppeals(msg.message_body);
    const nextMessage = inboundMessages[index];
    if (nextMessage && (nextMessage.sentiment_score || 0) > 0.5) {
      engagementAccelerators.push(emotional);
    }
  });
  
  return {
    ...basicMetrics,
    most_effective_psychology: mostEffectivePsychology,
    sentiment_improvement: sentimentImprovement,
    effective_trust_methods: 'empathy,credibility', // Simplified for this example
    successful_emotional_arc: sentimentProgression,
    successful_urgency_techniques: 'time_deadline,opportunity_window',
    engagement_accelerators: engagementAccelerators.join(','),
    dropout_signals: 'short_responses,delayed_replies',
    conversion_signals: 'detailed_questions,positive_sentiment',
    time_to_escalation: 24 // Simplified
  };
}

/**
 * Extract objection patterns from conversation
 */
function extractObjectionPatterns(messages) {
  const inboundMessages = messages.filter(m => m.direction === 'inbound');
  const objections = [];
  let resolutionCount = 0;
  
  inboundMessages.forEach((msg, index) => {
    const objection = detectObjection(msg.message_body);
    if (objection) {
      objections.push(objection);
      
      // Check if next outbound message successfully handled it
      const nextOutbound = messages.find(m => 
        m.direction === 'outbound' && 
        new Date(m.timestamp) > new Date(msg.timestamp)
      );
      
      if (nextOutbound) {
        const handlingStyle = detectObjectionHandlingStyle(nextOutbound.message_body);
        if (handlingStyle !== 'none') {
          resolutionCount++;
        }
      }
    }
  });
  
  return {
    common_triggers: objections.map(o => o.type).join(','),
    most_effective_handling: 'empathy_then_evidence', // Simplified
    resolution_rate: objections.length > 0 ? resolutionCount / objections.length : 0
  };
}

/**
 * Detect objections in messages
 */
function detectObjection(message) {
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
 * Detect objection handling style
 */
function detectObjectionHandlingStyle(message) {
  if (/understand.*how.*feel|appreciate.*concern|respect.*that/i.test(message)) {
    return 'empathy_validation';
  }
  if (/actually|here's.*the.*thing|what.*I've.*found/i.test(message)) {
    return 'reframe_perspective';
  }
  if (/other.*clients|similar.*situation|companies.*like.*yours/i.test(message)) {
    return 'social_proof_response';
  }
  if (/guarantee|promise|proven|evidence/i.test(message)) {
    return 'evidence_based';
  }
  
  return 'none';
}

/**
 * Map psychological journey through conversation
 */
function mapPsychologicalJourney(messages, scoreHistory) {
  const emotionalJourney = messages.map((msg, index) => {
    const beforeScore = scoreHistory[index] || {};
    const afterScore = scoreHistory[index + 1] || {};
    
    return {
      message_index: index,
      direction: msg.direction,
      psychological_technique: msg.direction === 'outbound' ? 
        detectPsychologicalTechniques(msg.message_body) : 'response',
      emotional_impact: {
        sentiment_change: (afterScore.sentiment_score || 0) - (beforeScore.sentiment_score || 0),
        motivation_change: (afterScore.motivation_score || 0) - (beforeScore.motivation_score || 0),
        hesitation_change: (beforeScore.hesitation_score || 0) - (afterScore.hesitation_score || 0),
        urgency_change: (afterScore.urgency_score || 0) - (beforeScore.urgency_score || 0)
      },
      psychological_state: categorizesPsychologicalState(afterScore),
      conversation_momentum: calculateMomentumShift(beforeScore, afterScore)
    };
  });
  
  const sentimentChanges = scoreHistory.map(score => score.sentiment_score || 0);
  const engagementChanges = scoreHistory.map(score => score.engagement_curve || 0);
  
  // Calculate various journey metrics
  const momentum = calculatePsychologicalMomentum(scoreHistory);
  const emotionalImprovement = sentimentChanges.length > 1 ? 
    sentimentChanges[sentimentChanges.length - 1] - sentimentChanges[0] : 0;
  
  return {
    emotional_journey: emotionalJourney,
    sentiment_changes: sentimentChanges,
    engagement_changes: engagementChanges,
    psychological_changes: {
      motivation: scoreHistory.map(score => score.motivation_score || 0),
      hesitation: scoreHistory.map(score => score.hesitation_score || 0),
      urgency: scoreHistory.map(score => score.urgency_score || 0)
    },
    trust_progression: calculateTrustProgression(scoreHistory),
    objection_sequence: extractObjectionSequence(messages),
    engagement_escalation: calculateEngagementEscalation(scoreHistory),
    momentum_score: momentum,
    emotional_improvement_rate: emotionalImprovement,
    objection_resolution_rate: 0.8, // Simplified
    progression_score: momentum * 0.7 + emotionalImprovement * 0.3,
    emotional_peaks_valleys: identifyEmotionalPeaksValleys(sentimentChanges),
    rhythm_analysis: analyzeConversationRhythm(messages)
  };
}

/**
 * Calculate psychological effectiveness of message components
 */
function calculatePsychologicalEffectiveness(psychologicalImpact, messageComponents) {
  const overallScore = (
    Math.abs(psychologicalImpact.motivation_change) * 0.3 +
    Math.abs(psychologicalImpact.engagement_change) * 0.25 +
    Math.abs(psychologicalImpact.hesitation_change) * 0.2 +
    Math.abs(psychologicalImpact.urgency_change) * 0.15 +
    Math.abs(psychologicalImpact.decisiveness_change) * 0.1
  ) / 5;
  
  return {
    overall_score: Math.min(overallScore, 10),
    emotional_resonance: Math.abs(psychologicalImpact.engagement_change),
    trust_building: psychologicalImpact.skepticism_change < 0 ? Math.abs(psychologicalImpact.skepticism_change) : 0,
    objection_prevention: psychologicalImpact.hesitation_change,
    action_motivation: psychologicalImpact.motivation_change,
    confidence_level: 0.75 // Simplified calculation
  };
}

/**
 * Calculate personality alignment score
 */
function calculatePersonalityAlignment(messageBody, leadPsychProfile) {
  // Simplified alignment calculation
  const techniques = detectPsychologicalTechniques(messageBody);
  const appeals = detectEmotionalAppeals(messageBody);
  
  // This would be more sophisticated in production
  if (techniques.includes('social_proof') && (leadPsychProfile.personality_skepticism_score || 0) > 60) {
    return 0.8; // High skepticism needs social proof
  }
  if (appeals.includes('urgency') && (leadPsychProfile.personality_decisiveness_score || 0) > 70) {
    return 0.9; // Decisive people respond to urgency
  }
  
  return 0.6; // Default moderate alignment
}

// Additional helper functions with simplified implementations
function calculateEmotionalIntelligence(messageBody) {
  const empathyWords = /understand|feel|appreciate|realize/gi;
  const matches = (messageBody.match(empathyWords) || []).length;
  return Math.min(matches * 0.2, 1.0);
}

function calculatePersuasionDensity(messageBody) {
  const techniques = detectPsychologicalTechniques(messageBody);
  const appeals = detectEmotionalAppeals(messageBody);
  const totalTechniques = (techniques !== 'none' ? techniques.split(',').length : 0) +
                         (appeals !== 'none' ? appeals.split(',').length : 0);
  return Math.min(totalTechniques / (messageBody.length / 100), 1.0);
}

function categorizesPsychologicalState(score) {
  const motivation = score.motivation_score || 50;
  const hesitation = score.hesitation_score || 50;
  const urgency = score.urgency_score || 50;
  
  if (motivation > 70 && hesitation < 30) return 'highly_motivated';
  if (hesitation > 70) return 'hesitant_resistant';
  if (urgency > 70) return 'urgently_engaged';
  if (motivation < 30 && hesitation > 50) return 'disengaged';
  return 'moderately_engaged';
}

function calculateMomentumShift(beforeScore, afterScore) {
  const motivationShift = (afterScore.motivation_score || 0) - (beforeScore.motivation_score || 0);
  const hesitationShift = (beforeScore.hesitation_score || 0) - (afterScore.hesitation_score || 0);
  const engagementShift = (afterScore.engagement_curve || 0) - (beforeScore.engagement_curve || 0);
  
  return (motivationShift + hesitationShift + engagementShift) / 3;
}

function calculatePsychologicalMomentum(scoreHistory) {
  if (scoreHistory.length < 2) return 0;
  
  let momentum = 0;
  for (let i = 1; i < scoreHistory.length; i++) {
    momentum += calculateMomentumShift(scoreHistory[i-1], scoreHistory[i]);
  }
  
  return momentum / (scoreHistory.length - 1);
}

function calculateTrustProgression(scoreHistory) {
  return scoreHistory.map(score => {
    const skepticism = score.personality_skepticism_score || 50;
    return 100 - skepticism; // Inverse of skepticism as trust proxy
  });
}

function extractObjectionSequence(messages) {
  return messages
    .filter(m => m.direction === 'inbound')
    .map(m => detectObjection(m.message_body))
    .filter(o => o !== null)
    .map(o => o.type);
}

function calculateEngagementEscalation(scoreHistory) {
  return scoreHistory.map(score => score.engagement_curve || 0);
}

function identifyEmotionalPeaksValleys(sentimentChanges) {
  const peaks = [];
  const valleys = [];
  
  for (let i = 1; i < sentimentChanges.length - 1; i++) {
    if (sentimentChanges[i] > sentimentChanges[i-1] && sentimentChanges[i] > sentimentChanges[i+1]) {
      peaks.push({ index: i, value: sentimentChanges[i] });
    }
    if (sentimentChanges[i] < sentimentChanges[i-1] && sentimentChanges[i] < sentimentChanges[i+1]) {
      valleys.push({ index: i, value: sentimentChanges[i] });
    }
  }
  
  return { peaks, valleys };
}

function analyzeConversationRhythm(messages) {
  const intervals = [];
  for (let i = 1; i < messages.length; i++) {
    const timeDiff = new Date(messages[i].timestamp) - new Date(messages[i-1].timestamp);
    intervals.push(timeDiff / (1000 * 60)); // Convert to minutes
  }
  
  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  return {
    avg_response_interval_minutes: avgInterval,
    rhythm_consistency: calculateRhythmConsistency(intervals)
  };
}

function calculateRhythmConsistency(intervals) {
  if (intervals.length < 2) return 1;
  
  const mean = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - mean, 2), 0) / intervals.length;
  const stdDev = Math.sqrt(variance);
  
  return Math.max(0, 1 - (stdDev / mean)); // Lower variance = higher consistency
}

function identifyCriticalMoments(messages, scoreHistory) {
  const breakthroughMoments = [];
  const stickingPoints = [];
  const conversionCatalysts = [];
  const dropoutRisks = [];
  
  // Simplified identification logic
  scoreHistory.forEach((score, index) => {
    if (index > 0) {
      const prevScore = scoreHistory[index - 1];
      const motivationChange = (score.motivation_score || 0) - (prevScore.motivation_score || 0);
      const hesitationChange = (prevScore.hesitation_score || 0) - (score.hesitation_score || 0);
      
      if (motivationChange > 15 && hesitationChange > 10) {
        breakthroughMoments.push({ index, type: 'major_breakthrough', strength: motivationChange });
      }
      if (motivationChange < -10 || hesitationChange < -15) {
        stickingPoints.push({ index, type: 'resistance_point', severity: Math.abs(motivationChange) });
      }
      if ((score.urgency_score || 0) > 80 && (score.motivation_score || 0) > 70) {
        conversionCatalysts.push({ index, type: 'ready_to_convert', readiness: score.urgency_score });
      }
      if ((score.engagement_curve || 0) < 30 && motivationChange < -5) {
        dropoutRisks.push({ index, type: 'disengagement_risk', risk_level: 100 - score.engagement_curve });
      }
    }
  });
  
  return {
    breakthrough_moments: breakthroughMoments,
    sticking_points: stickingPoints,
    conversion_catalysts: conversionCatalysts,
    dropout_risks: dropoutRisks
  };
}

function extractAdvancedConversationFlow(messages, scoreHistory) {
  const sequence = messages.map((msg, index) => ({
    direction: msg.direction,
    type: msg.direction === 'outbound' ? detectOpeningType(msg.message_body) : 'response',
    sentiment: msg.sentiment_score || 0,
    psychological_technique: msg.direction === 'outbound' ? detectPsychologicalTechniques(msg.message_body) : 'none',
    emotional_appeal: msg.direction === 'outbound' ? detectEmotionalAppeals(msg.message_body) : 'none'
  }));
  
  return {
    sequence: sequence,
    stage: determineConversationStage(messages),
    completion_rate: 1 // Simplified
  };
}

function determineConversationStage(messages) {
  const messageCount = messages.length;
  const hasObjections = messages.some(m => detectObjection(m.message_body));
  const hasUrgency = messages.some(m => detectUrgencyCreation(m.message_body) !== 'none');
  
  if (messageCount <= 3) return 'initial_contact';
  if (messageCount <= 6 && !hasObjections) return 'rapport_building';
  if (hasObjections && !hasUrgency) return 'objection_handling';
  if (hasUrgency) return 'closing_phase';
  return 'nurturing_phase';
}

// Keep existing basic helper functions
function extractMessageComponents(messageBody) {
  return {
    opening_type: detectOpeningType(messageBody),
    question_style: detectQuestionStyle(messageBody),
    tone_approach: detectToneApproach(messageBody),
    value_prop_type: detectValuePropType(messageBody),
    cta_style: detectCTAStyle(messageBody)
  };
}

function detectOpeningType(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('?')) return 'question';
  if (lowerMessage.includes('noticed') || lowerMessage.includes('saw')) return 'observation';
  if (lowerMessage.includes('congrat') || lowerMessage.includes('great')) return 'compliment';
  return 'statement';
}

function detectQuestionStyle(message) {
  const questionCount = (message.match(/\?/g) || []).length;
  if (questionCount === 0) return 'none';
  if (message.toLowerCase().includes('yes') || message.toLowerCase().includes('no')) return 'yes_no';
  if (message.toLowerCase().includes('which') || message.toLowerCase().includes('option')) return 'choice';
  if (message.toLowerCase().includes('challenge') || message.toLowerCase().includes('problem')) return 'pain_point';
  return 'open_ended';
}

function detectToneApproach(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('need to') || lowerMessage.includes('should')) return 'direct';
  if (lowerMessage.includes('might') || lowerMessage.includes('perhaps')) return 'soft';
  if (lowerMessage.includes('hey') || lowerMessage.includes('hope')) return 'friendly';
  return 'neutral';
}

function detectValuePropType(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('save') || lowerMessage.includes('increase')) return 'benefit';
  if (lowerMessage.includes('feature') || lowerMessage.includes('includes')) return 'feature';
  if (lowerMessage.includes('helped') || lowerMessage.includes('client')) return 'story';
  if (lowerMessage.includes('companies') || lowerMessage.includes('others')) return 'social_proof';
  return 'none';
}

function detectCTAStyle(message) {
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('call') || lowerMessage.includes('phone')) return 'call';
  if (lowerMessage.includes('meet') || lowerMessage.includes('chat')) return 'meet';
  if (lowerMessage.includes('reply') || lowerMessage.includes('let me know')) return 'respond';
  if (lowerMessage.includes('consider') || lowerMessage.includes('think')) return 'consider';
  return 'none';
}

function categorizePersonality(leadScore) {
  const categorize = (score) => {
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

function analyzeConversationMetrics(messages) {
  const outboundMessages = messages.filter((m) => m.direction === 'outbound');
  const inboundMessages = messages.filter((m) => m.direction === 'inbound');
  
  const avgMessageLength = outboundMessages.reduce((sum, m) => sum + (m.message_body?.length || 0), 0) / outboundMessages.length;
  const questionCount = outboundMessages.reduce((sum, m) => sum + (m.message_body?.match(/\?/g) || []).length, 0);
  const questionDensity = questionCount / outboundMessages.length;
  
  // Analyze tone effectiveness
  const toneEffectiveness = {};
  outboundMessages.forEach((msg) => {
    const tone = detectToneApproach(msg.message_body);
    if (!toneEffectiveness[tone]) toneEffectiveness[tone] = [];
    toneEffectiveness[tone].push(msg.sentiment_score || 0);
  });
  
  const mostEffectiveTone = Object.keys(toneEffectiveness).reduce((best, tone) => {
    const avgScore = toneEffectiveness[tone].reduce((sum, score) => sum + score, 0) / toneEffectiveness[tone].length;
    return avgScore > (toneEffectiveness[best]?.reduce((sum, score) => sum + score, 0) / toneEffectiveness[best]?.length || 0) ? tone : best;
  }, 'neutral');
  
  return {
    avg_message_length: Math.round(avgMessageLength),
    question_density: questionDensity,
    most_effective_tone: mostEffectiveTone,
    avg_response_time_hours: 24,
    conversion_rate: inboundMessages.length > 0 ? 1 : 0
  };
}

function analyzePsychologicalJourney(scoreHistory) {
  const sentimentChanges = scoreHistory.map((score) => score.sentiment_score || 0);
  const engagementChanges = scoreHistory.map((score) => score.engagement_curve || 0);
  const psychologicalChanges = {
    motivation: scoreHistory.map((score) => score.motivation_score || 0),
    hesitation: scoreHistory.map((score) => score.hesitation_score || 0),
    urgency: scoreHistory.map((score) => score.urgency_score || 0)
  };
  
  return {
    sentiment_changes: sentimentChanges,
    engagement_changes: engagementChanges,
    psychological_changes: psychologicalChanges
  };
}

function hashMessage(components) {
  const str = JSON.stringify(components);
  return btoa(str).substring(0, 32); // Simple hash for grouping similar messages
}

// ==========================================
// 🎯 PLAN-BASED LEARNING FUNCTIONS
// ==========================================

const getTenantPlan = async (supabase, tenantId) => {
  const { data, error } = await supabase.from('tenants').select('plan').eq('id', tenantId).single();
  if (error || !data) {
    console.warn('Could not fetch tenant plan, defaulting to starter');
    return 'starter';
  }
  return data.plan || 'starter';
};

const getFeatureValue = (plan, feature) => {
  const PLAN_FEATURES = {
    starter: { conversationMemory: 0 },
    growth: { conversationMemory: 100 },
    scale: { conversationMemory: 1000 },
    enterprise: { conversationMemory: -1 }
  };
  return PLAN_FEATURES[plan]?.[feature] || 0;
};

// ==========================================
// 🚀 MAIN SERVE FUNCTION
// ==========================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      return new Response('Server configuration error', { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body
    const requestBody = await req.json();
    const { action, message_id, lead_id, tenant_id, response_data } = requestBody;

    if (!tenant_id) {
      return new Response('Missing tenant_id', { status: 400 });
    }

    // Check if tenant's plan allows learning
    const tenantPlan = await getTenantPlan(supabase, tenant_id);
    const conversationLimit = getFeatureValue(tenantPlan, 'conversationMemory');
    
    if (conversationLimit === 0) {
      console.log(`⚠️ Tenant ${tenant_id} on ${tenantPlan} plan - no AI learning allowed`);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Learning not available on starter plan' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`🎯 Enhanced AI Learning: ${tenantPlan} plan (limit: ${conversationLimit === -1 ? 'unlimited' : conversationLimit})`);

    // Handle different learning actions
    switch (action) {
      case 'analyze_message':
        if (!message_id || !response_data) {
          return new Response('Missing message_id or response_data', { status: 400 });
        }
        await analyzeMessagePsychology(supabase, tenant_id, message_id, response_data);
        break;
        
      case 'learn_personality':
        if (!lead_id) {
          return new Response('Missing lead_id', { status: 400 });
        }
        await learnPersonalityPatterns(supabase, tenant_id, lead_id);
        break;
        
      case 'analyze_flow':
        if (!lead_id) {
          return new Response('Missing lead_id', { status: 400 });
        }
        await analyzeConversationFlow(supabase, tenant_id, lead_id);
        break;
        
      case 'full_analysis':
        // Run all enhanced learning functions for a lead
        if (!lead_id || !message_id) {
          return new Response('Missing lead_id or message_id for full analysis', { status: 400 });
        }
        
        console.log('🧠 Running enhanced full learning analysis...');
        
        // Run all enhanced learning functions
        await analyzeMessagePsychology(supabase, tenant_id, message_id, response_data || { responded: true });
        await learnPersonalityPatterns(supabase, tenant_id, lead_id);
        
        // Only analyze flow if enough conversation exists
        const { data: messageCount } = await supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('lead_id', lead_id);
          
        if (messageCount && messageCount.length >= 3) {
          await analyzeConversationFlow(supabase, tenant_id, lead_id);
        }
        
        console.log('✅ Enhanced full learning analysis completed');
        break;
        
      default:
        return new Response('Invalid action. Use: analyze_message, learn_personality, analyze_flow, or full_analysis', { status: 400 });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      action: action,
      plan: tenantPlan,
      learning_enabled: true,
      enhanced_psychology: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced AI Learning Engine error:', error);
    return new Response(JSON.stringify({ 
      error: 'Enhanced learning engine error', 
      details: error.message 
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});