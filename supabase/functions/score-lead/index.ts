import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
// Helper function to calculate average
const getAvg = (nums)=>nums.length ? nums.reduce((a, b)=>a + b, 0) / nums.length : null;
// Helper function to calculate standard deviation
const getStdDev = (nums)=>{
  if (nums.length < 2) return 0;
  const avg = getAvg(nums);
  const squareDiffs = nums.map((value)=>Math.pow(value - avg, 2));
  const avgSquareDiff = getAvg(squareDiffs);
  return Math.sqrt(avgSquareDiff);
};
// Helper function to calculate trend (positive, negative, neutral)
const calculateTrend = (values)=>{
  if (values.length < 2) return 0;
  // Sort by timestamp
  const sorted = values.sort((a, b)=>new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  // Calculate linear regression slope
  const n = sorted.length;
  const sumX = sorted.reduce((sum, _, i)=>sum + i, 0);
  const sumY = sorted.reduce((sum, item)=>sum + item.value, 0);
  const sumXY = sorted.reduce((sum, item, i)=>sum + i * item.value, 0);
  const sumX2 = sorted.reduce((sum, _, i)=>sum + i * i, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  // Normalize slope to -100 to 100 scale
  return Math.max(-100, Math.min(100, slope * 10));
};
// Helper function to analyze message content for keywords
const analyzeMessageContent = (messages, keywords)=>{
  const totalMessages = messages.length;
  if (totalMessages === 0) return 0;
  let keywordCount = 0;
  messages.forEach((msg)=>{
    const content = (msg.message_body || '').toLowerCase();
    keywords.forEach((keyword)=>{
      if (content.includes(keyword.toLowerCase())) {
        keywordCount++;
      }
    });
  });
  return Math.min(100, keywordCount / totalMessages * 100);
};
// Helper function to calculate message uniqueness
const calculateMessageUniqueness = (messages)=>{
  if (messages.length < 2) return 100;
  const messageTexts = messages.map((m)=>(m.message_body || '').toLowerCase());
  const uniqueMessages = new Set(messageTexts);
  return uniqueMessages.size / messageTexts.length * 100;
};
// Helper function to calculate engagement curve
const calculateEngagementCurve = (messages)=>{
  if (messages.length < 3) return 0;
  // Divide conversation into thirds
  const third = Math.floor(messages.length / 3);
  const firstThird = messages.slice(0, third);
  const middleThird = messages.slice(third, third * 2);
  const lastThird = messages.slice(third * 2);
  // Calculate message frequency for each third
  const getFrequency = (msgs)=>{
    if (msgs.length < 2) return 0;
    const duration = new Date(msgs[msgs.length - 1].timestamp).getTime() - new Date(msgs[0].timestamp).getTime();
    return msgs.length / (duration / 3600000); // messages per hour
  };
  const freq1 = getFrequency(firstThird);
  const freq2 = getFrequency(middleThird);
  const freq3 = getFrequency(lastThird);
  // Calculate curve: positive if increasing, negative if decreasing
  const trend1 = freq2 - freq1;
  const trend2 = freq3 - freq2;
  const overallTrend = (trend1 + trend2) / 2;
  return Math.max(-100, Math.min(100, overallTrend * 10));
};
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('OK', {
      headers: corsHeaders
    });
  }
  try {
    const { lead_id, tenant_id } = await req.json();
    if (!lead_id || !tenant_id) {
      return new Response(JSON.stringify({
        error: 'Missing lead_id or tenant_id'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }
    const { data: messages, error } = await supabase.from('messages').select('*').eq('lead_id', lead_id).eq('tenant_id', tenant_id).order('timestamp', {
      ascending: true
    });
    if (error) throw error;
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({
        error: 'No messages found'
      }), {
        status: 404,
        headers: corsHeaders
      });
    }
    // Separate messages by direction
    const inboundMessages = messages.filter((msg)=>msg.direction === 'inbound');
    const outboundMessages = messages.filter((msg)=>msg.direction === 'outbound');
    // Extract scores from messages - handle all available scoring fields
    const hesitationScores = inboundMessages.map((m)=>m.hesitation_score).filter((x)=>x !== null && x !== undefined);
    const urgencyScores = inboundMessages.map((m)=>m.urgency_score).filter((x)=>x !== null && x !== undefined);
    const sentimentScores = inboundMessages.map((m)=>m.contextual_sentiment_score || m.sentiment_score).filter((x)=>x !== null && x !== undefined).map((x)=>parseFloat(x));
    const responseScores = inboundMessages.map((m)=>m.response_score).filter((x)=>x !== null && x !== undefined);
    const weightedScores = inboundMessages.map((m)=>m.weighted_score).filter((x)=>x !== null && x !== undefined);
    const qualificationScores = inboundMessages.map((m)=>m.openai_qualification_score).filter((x)=>x !== null && x !== undefined);
    const sentimentMagnitudes = inboundMessages.map((m)=>m.sentiment_magnitude).filter((x)=>x !== null && x !== undefined).map((x)=>parseFloat(x));
    // Calculate reply delays
    const replyDelays = [];
    inboundMessages.forEach((msg)=>{
      const previousOutbound = outboundMessages.filter((m)=>new Date(m.timestamp) < new Date(msg.timestamp)).pop();
      if (previousOutbound) {
        const delay = (new Date(msg.timestamp).getTime() - new Date(previousOutbound.timestamp).getTime()) / 60000;
        replyDelays.push(delay);
      }
    });
    // Calculate basic metrics
    const firstMessageTime = new Date(messages[0].timestamp).getTime();
    const lastMessageTime = new Date(messages[messages.length - 1].timestamp).getTime();
    const durationMinutes = (lastMessageTime - firstMessageTime) / 60000;
    const recencyHours = (Date.now() - lastMessageTime) / 3600000;
    // ========== CALCULATE ALL INDIVIDUAL SCORES FIRST ==========
    // FIXED: Use OpenAI's motivation scores (stored as response_score) instead of keyword matching
    const openAiMotivationScores = responseScores; // These are the motivation scores from OpenAI
    const avgOpenAiMotivation = getAvg(openAiMotivationScores);
    // Enhanced motivation keywords for fallback
    const motivationKeywords = [
      // Enthusiasm keywords (original)
      'excited',
      'eager',
      'ready',
      'can\'t wait',
      'looking forward',
      'interested',
      'love',
      'great',
      'awesome',
      'perfect',
      // Business intent keywords
      'need',
      'looking for',
      'help',
      'solution',
      'problem',
      'challenging',
      'difficult',
      'tough',
      'struggling',
      // Buying signals
      'price',
      'cost',
      'charge',
      'pricing',
      'how much',
      'budget',
      'invest',
      'pay',
      'fee',
      'rate',
      'quote',
      'estimate',
      'proposal',
      // Exploratory intent
      'maybe',
      'possibly',
      'considering',
      'thinking about',
      'exploring',
      'options',
      'tell me more',
      'information',
      'details',
      'explain',
      'how does',
      'what about'
    ];
    const keywordMotivationScore = analyzeMessageContent(inboundMessages, motivationKeywords);
    // Use OpenAI's evaluation if available, otherwise use enhanced keyword analysis
    const motivationScore = avgOpenAiMotivation !== null && avgOpenAiMotivation > 0 ? avgOpenAiMotivation : keywordMotivationScore;
    console.log('🎯 Motivation Score Calculation:', {
      openAiMotivationScores,
      avgOpenAiMotivation,
      keywordMotivationScore,
      finalMotivationScore: motivationScore
    });
    // Analyze objections
    const objectionKeywords = [
      'expensive',
      'cost too much',
      'price too high',
      'budget',
      'afford',
      'cheap',
      'competitor',
      'alternative',
      'not interested',
      'no thanks',
      'don\'t need',
      'already have',
      'not ready',
      'not now'
    ];
    const objectionScore = analyzeMessageContent(inboundMessages, objectionKeywords);
    // Analyze escalation keywords
    const escalationKeywords = [
      'urgent',
      'asap',
      'immediately',
      'now',
      'help',
      'please',
      'important',
      'critical',
      'emergency',
      'need',
      'must'
    ];
    const escalationScore = analyzeMessageContent(inboundMessages, escalationKeywords);
    const escalationCount = inboundMessages.filter((msg)=>{
      const content = (msg.message_body || '').toLowerCase();
      return escalationKeywords.some((keyword)=>content.includes(keyword));
    }).length;
    // Analyze next steps clarity
    const nextStepKeywords = [
      'next',
      'then',
      'after',
      'schedule',
      'meeting',
      'call',
      'appointment',
      'follow up',
      'contact',
      'will',
      'plan'
    ];
    const nextStepClarity = analyzeMessageContent(messages, nextStepKeywords);
    // Analyze goal clarity
    const goalKeywords = [
      'want',
      'need',
      'looking for',
      'interested in',
      'goal',
      'objective',
      'trying to',
      'hope to',
      'plan to',
      'would like'
    ];
    const goalClarity = analyzeMessageContent(inboundMessages, goalKeywords);
    // Calculate question density
    const questionCount = inboundMessages.filter((msg)=>(msg.message_body || '').includes('?')).length;
    const questionDensity = inboundMessages.length > 0 ? questionCount / inboundMessages.length * 100 : 0;
    // Analyze confirmation behavior
    const confirmationKeywords = [
      'yes',
      'yeah',
      'sure',
      'ok',
      'okay',
      'confirm',
      'agree',
      'correct',
      'right',
      'exactly',
      'definitely',
      'absolutely'
    ];
    const confirmationScore = analyzeMessageContent(inboundMessages, confirmationKeywords);
    // Calculate reply speed score
    const avgReplyDelay = getAvg(replyDelays);
    const replySpeedScore = avgReplyDelay !== null ? Math.max(0, 100 - avgReplyDelay / 10) // Faster replies = higher score
     : 50;
    // Analyze follow-up acceptance
    const followupKeywords = [
      'sounds good',
      'works for me',
      'let\'s do it',
      'i\'m in',
      'count me in',
      'yes please',
      'that works',
      'perfect'
    ];
    const followupAcceptance = analyzeMessageContent(inboundMessages, followupKeywords);
    // Analyze personality traits
    const decisivenessKeywords = [
      'decide',
      'definitely',
      'absolutely',
      'certain',
      'sure',
      'will',
      'going to',
      'committed',
      'ready'
    ];
    const decisiveness = analyzeMessageContent(inboundMessages, decisivenessKeywords);
    const skepticismKeywords = [
      'but',
      'however',
      'not sure',
      'maybe',
      'perhaps',
      'doubt',
      'question',
      'concern',
      'worried',
      'hesitant',
      'unsure'
    ];
    const skepticism = analyzeMessageContent(inboundMessages, skepticismKeywords);
    // Analyze personal context usage
    const personalKeywords = [
      'i',
      'me',
      'my',
      'we',
      'our',
      'personally',
      'experience',
      'situation',
      'case',
      'specifically'
    ];
    const personalContext = analyzeMessageContent(inboundMessages, personalKeywords);
    // Calculate message uniqueness
    const messageUniqueness = calculateMessageUniqueness(inboundMessages);
    // Calculate AI hesitation score (looking for uncertainty in AI responses)
    const aiHesitationKeywords = [
      'might',
      'could',
      'possibly',
      'perhaps',
      'maybe',
      'not sure',
      'unclear',
      'depends'
    ];
    const aiHesitation = analyzeMessageContent(outboundMessages, aiHesitationKeywords);
    // Calculate message frequency and length
    const messageFrequency = inboundMessages.length / Math.max(durationMinutes / 60, 0.01);
    const messageLength = getAvg(inboundMessages.map((m)=>(m.message_body || '').length)) || 0;
    // Extract AI scores
    const avgHesitation = getAvg(hesitationScores) || 50;
    const avgUrgency = getAvg(urgencyScores) || 50;
    const avgQualification = getAvg(qualificationScores) || 50;
    const avgWeighted = getAvg(weightedScores) || 50;
    const avgResponseScore = getAvg(responseScores) || 50;
    const responseRate = inboundMessages.length / Math.max(outboundMessages.length, 1);
    const engagementScore = Math.min(100, responseRate * 50);
    const recencyScore = Math.max(0, 100 - recencyHours * 2); // Decay over time
    // Calculate sentiment-related scores
    const allSentiments = [
      ...sentimentScores
    ];
    const avgSentiment = getAvg(allSentiments) || 50;
    const sentimentData = inboundMessages.filter((m)=>m.contextual_sentiment_score !== null || m.sentiment_score !== null).map((m)=>({
        value: parseFloat(m.contextual_sentiment_score || m.sentiment_score),
        timestamp: m.timestamp
      }));
    const sentimentTrend = calculateTrend(sentimentData);
    const toneConsistency = allSentiments.length > 1 ? Math.max(0, 100 - getStdDev(allSentiments)) : 85;
    const avgSentimentMagnitude = getAvg(sentimentMagnitudes);
    const polarityScore = avgSentimentMagnitude !== null ? Math.min(100, avgSentimentMagnitude * 20) : sentimentScores.length > 0 ? getAvg(sentimentScores.map((s)=>Math.abs(s - 50))) || 0 : 0;
    // Calculate engagement curve
    const engagementCurve = calculateEngagementCurve(messages);
    // ========== NOW CALCULATE COMPREHENSIVE HOT SCORE ==========
    // 1. Behavioral Engagement (how they interact)
    const behavioralScore = getAvg([
      replySpeedScore,
      Math.min(100, messageFrequency * 10),
      Math.min(100, responseRate * 100),
      messageUniqueness,
      Math.min(100, messageLength / 2) // Message effort/length
    ].filter((x)=>x !== null)) || 0;
    // 2. Emotional State (their mindset) - NOW USING CORRECT MOTIVATION
    const emotionalScore = getAvg([
      100 - avgHesitation,
      motivationScore,
      avgUrgency,
      100 - skepticism // Less skepticism is better
    ].filter((x)=>x !== null)) || 0;
    // 3. Intent Clarity (do they know what they want)
    const intentScore = getAvg([
      goalClarity,
      nextStepClarity,
      confirmationScore,
      followupAcceptance,
      decisiveness // Being decisive
    ].filter((x)=>x !== null)) || 0;
    // 4. Sentiment Quality (tone and consistency)
    const sentimentQualityScore = getAvg([
      avgSentiment,
      toneConsistency,
      100 - polarityScore,
      Math.max(0, (sentimentTrend + 100) / 2) // Trend normalized to 0-100
    ].filter((x)=>x !== null)) || 0;
    // 5. Conversation Quality (depth of engagement)
    const conversationQualityScore = getAvg([
      questionDensity,
      personalContext,
      100 - objectionScore,
      Math.min(100, escalationScore),
      Math.max(0, (engagementCurve + 100) / 2) // Engagement trajectory
    ].filter((x)=>x !== null)) || 0;
    // 6. AI-Derived Intelligence (from AI analysis)
    const aiIntelligenceScore = getAvg([
      avgQualification,
      avgWeighted,
      avgResponseScore // Response score from AI
    ].filter((x)=>x !== null && x !== 0)) || 50;
    // 7. Recency Bonus (recent interactions matter more)
    const recencyBonus = recencyScore;
    // FINAL HOT SCORE - Weighted combination of all categories
    const hotScore = Math.round(behavioralScore * 0.20 + // 20% - How they engage
    emotionalScore * 0.20 + // 20% - Their emotional state
    intentScore * 0.15 + // 15% - Clarity of intent
    sentimentQualityScore * 0.15 + // 15% - Quality of sentiment
    conversationQualityScore * 0.15 + // 15% - Conversation quality
    aiIntelligenceScore * 0.10 + // 10% - AI insights
    recencyBonus * 0.05 // 5%  - Recency bonus
    );
    // ✅ FETCH TENANT'S CUSTOM HOT LEAD THRESHOLD
    let hotThreshold = 70; // Default threshold
    try {
      const { data: escalationSetting, error } = await supabase.from('platform_settings').select('value').eq('key', 'ai_min_escalation_score').eq('tenant_id', tenant_id).maybeSingle();
      if (error) {
        console.error('❌ Error fetching escalation setting:', error);
      } else if (escalationSetting?.value) {
        const parsedThreshold = parseInt(escalationSetting.value);
        if (!isNaN(parsedThreshold) && parsedThreshold > 0 && parsedThreshold <= 100) {
          hotThreshold = parsedThreshold;
        } else {
          console.warn('⚠️ Invalid escalation threshold value:', escalationSetting.value);
        }
      }
    } catch (settingError) {
      console.error('❌ Exception fetching escalation setting:', settingError);
    }
    console.log(`🎯 Using hot lead threshold: ${hotThreshold} for tenant ${tenant_id}`);
    // Determine lead status based on comprehensive hot_score
    let newLeadStatus = '';
    if (hotScore >= hotThreshold) {
      newLeadStatus = 'Hot Lead';
    } else if (hotScore >= 60) {
      newLeadStatus = 'Engaged';
    } else if (hotScore >= 50) {
      newLeadStatus = 'Warm Lead';
    } else if (hotScore >= 20) {
      newLeadStatus = 'Cold Lead';
    } else {
      newLeadStatus = 'Cold Lead';
    }
    // Update the actual leads table with the new status
    let updateData = {
      status: newLeadStatus
    };
    // ✅ DISABLE AI WHEN LEAD BECOMES HOT
    if (newLeadStatus === 'Hot Lead') {
      updateData.ai_conversation_enabled = false;
      console.log(`🔥 Lead hit ${hotScore}/${hotThreshold} threshold - disabling AI, handing off to sales`);
    }
    const { error: updateLeadError } = await supabase.from('leads').update(updateData).eq('id', lead_id);
    if (updateLeadError) {
      console.error('❌ Error updating lead status:', updateLeadError);
    } else {
      console.log(`✅ Lead status updated to "${newLeadStatus}" based on hot_score: ${hotScore}`);
      if (newLeadStatus === 'Hot Lead') {
        console.log('🤖 AI conversation disabled - lead handed off to sales team');
      }
    }
    // ===== A/B TESTING OUTCOME TRACKING =====
    // Track experiment outcomes when leads become "Hot Lead"
    if (newLeadStatus === 'Hot Lead') {
      console.log('🧪 Hot Lead conversion detected - checking for experiment assignment...');
      try {
        const { error: outcomeError } = await supabase.from('experiment_results').update({
          outcome_type: 'conversion',
          metric_value: 1,
          recorded_at: new Date()
        }).eq('lead_id', lead_id).is('recorded_at', null); // Only update if not already recorded
        if (outcomeError) {
          console.error('❌ Error recording experiment outcome:', outcomeError);
        } else {
          console.log('✅ Experiment conversion outcome recorded');
        }
      } catch (expError) {
        console.error('❌ Error in experiment outcome tracking:', expError);
      }
    }
    console.log('🔥 Hot Score Calculation Details:', {
      behavioralScore,
      emotionalScore,
      intentScore,
      sentimentQualityScore,
      conversationQualityScore,
      aiIntelligenceScore,
      recencyBonus,
      finalHotScore: hotScore,
      motivationBreakdown: {
        openAiScores: openAiMotivationScores,
        avgOpenAi: avgOpenAiMotivation,
        keywordScore: keywordMotivationScore,
        finalMotivation: motivationScore
      }
    });
    // Calculate interest level using the already calculated scores
    const interestLevel = Math.round(Math.min(100, messageLength / 2) * 0.2 + Math.min(100, messageFrequency * 20) * 0.2 + questionDensity * 0.15 + (100 - avgHesitation) * 0.15 + avgResponseScore * 0.15 + avgQualification * 0.15);
    // Determine funnel stage based on hot score and other metrics
    let funnelStage = 'Unknown';
    if (inboundMessages.length === 0) {
      funnelStage = 'No Response';
    } else if (inboundMessages.length === 1) {
      funnelStage = 'Initial Contact';
    } else if (hotScore < 20) {
      funnelStage = 'Cold';
    } else if (hotScore < 40) {
      funnelStage = 'Lukewarm';
    } else if (hotScore < 60) {
      funnelStage = 'Warm';
    } else if (hotScore < 80) {
      funnelStage = 'Engaged';
    } else if (hotScore >= 80 && nextStepClarity > 70) {
      funnelStage = 'Qualified';
    } else {
      funnelStage = 'Hot';
    }
    // ========== ENHANCED ENTERPRISE ALERT TRIGGERS & BUSINESS RULES ==========
    // Get conversation text for pattern matching
    const conversationText = messages.map((m)=>m.message_body || '').join(' ').toLowerCase();
    const lastInboundMessage = inboundMessages[inboundMessages.length - 1]?.message_body?.toLowerCase() || '';
    // Minimum engagement requirements to prevent false positives
    const MIN_MESSAGES_FOR_CRITICAL = 3; // Need at least 3 inbound messages
    const MIN_CONVERSATION_DURATION = 5; // At least 5 minutes of conversation
    const MIN_TOTAL_ENGAGEMENT = 5; // At least 5 total messages (in + out)
    // Calculate engagement depth
    const totalMessages = messages.length;
    const hasMinimumEngagement = inboundMessages.length >= MIN_MESSAGES_FOR_CRITICAL && durationMinutes >= MIN_CONVERSATION_DURATION && totalMessages >= MIN_TOTAL_ENGAGEMENT;
    // Enhanced critical triggers - More aggressive on genuine intent
    // CRITICAL SCORE - Immediate attention needed (different from HOT)
    const criticalScore = Math.round(avgUrgency * 0.35 + // High urgency signals
    escalationScore * 0.25 + // "need", "asap", "help" keywords  
    confirmationScore * 0.20 + // "yes", "let's do it", agreements
    questionDensity * 0.10 + // Multiple questions = engagement
    followupAcceptance * 0.10 // Accepting next steps
    );
    // Keep all triggers functional for notification system
    const criticalTriggers = {
      ai_critical_score: criticalScore > 75,
      requested_callback: /call me|phone me|give me a call/i.test(conversationText),
      agreed_to_meeting: /let's schedule|book.*meeting/i.test(conversationText),
      // Keep these active for comprehensive detection
      pricing_inquiry: inboundMessages.length >= 3 && motivationScore > 50 && /what.*charge|what.*cost|what.*price|pricing|how much|what.*fee|quote/i.test(conversationText),
      buying_signal: /\b(ready to buy|want to purchase|let's get started|ready to proceed|sign me up)\b/i.test(conversationText),
      timeline_urgent: /need.*(asap|today|tomorrow|this week|immediately|urgent|right away)/i.test(conversationText),
      high_interest_question: questionDensity > 50 && inboundMessages.length >= 4 && messageFrequency > 0.5,
      explicit_timeline: /timeline|when.*start|how long|next month|this quarter|planning.*months/i.test(conversationText)
    };
    // AI-POWERED IMMEDIATE ATTENTION LOGIC (with protection)
    const requiresImmediateAttention = hasMinimumEngagement && (criticalTriggers.ai_critical_score || criticalTriggers.requested_callback || criticalTriggers.agreed_to_meeting || criticalTriggers.pricing_inquiry || criticalTriggers.buying_signal || criticalTriggers.timeline_urgent);
    const attentionReasons = [];
    if (criticalScore > 75) attentionReasons.push('high_ai_critical_score');
    if (/call me|phone me|give me a call/i.test(conversationText)) attentionReasons.push('requested_callback');
    if (/let's schedule|book.*meeting/i.test(conversationText)) attentionReasons.push('agreed_to_meeting');
    // Create detailed alert information
    const alertDetails = requiresImmediateAttention ? {
      triggered_at: new Date().toISOString(),
      reasons: attentionReasons,
      primary_reason: attentionReasons[0] || null,
      last_message: lastInboundMessage.substring(0, 100) // First 100 chars for context
    } : null;
    // Enhanced business rule overrides - More aggressive on genuine signals
    // Enhanced business rule overrides - More aggressive on genuine signals
    let stageOverrideReason = null;
    if (criticalTriggers.requested_callback) {
      funnelStage = 'Hot';
      stageOverrideReason = 'explicit_callback_request';
    } else if (criticalTriggers.agreed_to_meeting) {
      funnelStage = 'Hot';
      stageOverrideReason = 'lead_agreed_to_next_step';
    } else if (criticalTriggers.ai_critical_score) {
      funnelStage = 'Hot';
      stageOverrideReason = 'ai_critical_score_detected';
    } else if (criticalTriggers.buying_signal) {
      funnelStage = 'Hot';
      stageOverrideReason = 'buying_signal_detected';
    }
    // Critical-only alert priority
    let alertPriority = 'none';
    if (requiresImmediateAttention) {
      alertPriority = 'critical';
    }
    // Enhanced logging for debugging false positives
    console.log('🔍 Engagement Analysis:', {
      totalMessages,
      inboundCount: inboundMessages.length,
      durationMinutes,
      hasMinimumEngagement,
      motivationScore,
      hotScore,
      questionDensity,
      messageFrequency,
      requiresImmediateAttention,
      alertPriority,
      triggeredReasons: Object.entries(criticalTriggers).filter(([_, triggered])=>triggered).map(([reason, _])=>reason)
    });
    // Calculate score trajectory based on multiple trend factors
    const scoreTrajectory = Math.round(sentimentTrend * 0.4 + // 40% sentiment trend
    engagementCurve * 0.4 + // 40% engagement curve
    (hotScore > 50 ? 20 : -20) * 0.2 // 20% based on current hot score
    );
    // Check if responded outside business hours (9 AM - 6 PM)
    const respondedOutsideHours = inboundMessages.some((msg)=>{
      const hour = new Date(msg.timestamp).getHours();
      return hour < 9 || hour >= 18;
    });
    // Check for repeated contact by analyzing phone numbers
    const uniquePhones = new Set(messages.map((m)=>m.phone).filter((p)=>p !== null));
    const repeatedContact = uniquePhones.size > 1;
    // Calculate phone validity based on presence and format
    let phoneValidityScore = 100;
    const leadPhone = messages.find((m)=>m.phone)?.phone;
    if (!leadPhone) {
      phoneValidityScore = 0;
    } else if (!/^\+?[\d\s\-\(\)]+$/.test(leadPhone) || leadPhone.length < 10) {
      phoneValidityScore = 50;
    }
    // Geo match score - would need actual geo data, using channel as proxy
    const channels = new Set(messages.map((m)=>m.channel).filter((c)=>c !== null));
    const geoMatchScore = channels.size === 1 ? 100 : 85;
    // Prepare the lead scores object with enterprise features
    const leadScores = {
      lead_id,
      hot_score: hotScore,
      total_responses: inboundMessages.length,
      avg_reply_delay: avgReplyDelay,
      message_frequency: messageFrequency,
      avg_message_length: getAvg(messages.map((m)=>(m.message_body || '').length)) || 0,
      conversation_duration_minutes: durationMinutes,
      interaction_recency_hours: recencyHours,
      conversation_depth: messages.length,
      avg_sentiment: avgSentiment,
      sentiment_trend: sentimentTrend,
      tone_consistency_score: toneConsistency,
      polarity_score: polarityScore,
      urgency_score: getAvg(urgencyScores),
      motivation_score: motivationScore,
      hesitation_score: getAvg(hesitationScores),
      objection_score: objectionScore,
      escalation_keywords_score: escalationScore,
      next_step_clarity_score: nextStepClarity,
      goal_clarity_score: goalClarity,
      engagement_curve: engagementCurve,
      question_density: questionDensity,
      confirmation_behavior_score: confirmationScore,
      reply_speed_score: replySpeedScore,
      followup_acceptance_score: followupAcceptance,
      personality_decisiveness_score: decisiveness,
      personality_skepticism_score: skepticism,
      use_of_personal_context_score: personalContext,
      message_uniqueness_score: messageUniqueness,
      interest_level_score: interestLevel,
      funnel_stage: funnelStage,
      score_trajectory: scoreTrajectory,
      escalation_trigger_count: escalationCount,
      ai_hesitation_score: aiHesitation,
      phone_validity_score: phoneValidityScore,
      geo_match_score: geoMatchScore,
      repeated_contact: repeatedContact,
      responded_outside_hours: respondedOutsideHours,
      manual_override: false,
      computed_by: 'engine_v4_improved',
      sentiment_score: avgSentiment,
      // ENHANCED ENTERPRISE FIELDS
      requires_immediate_attention: requiresImmediateAttention,
      alert_priority: alertPriority,
      alert_triggers: criticalTriggers,
      alert_details: alertDetails,
      stage_override_reason: stageOverrideReason,
      attention_reasons: attentionReasons
    };
// Always INSERT new scores for learning comparison
const { error: insertError } = await supabase.from('lead_scores').insert({
  ...leadScores,
  created_at: new Date().toISOString()  // Add timestamp for chronological order
});

if (insertError) throw insertError;
    // 🚨 REAL-TIME NOTIFICATION SYSTEM
    if (requiresImmediateAttention) {
      console.log('🚨 Critical alert triggered - disabling AI and handing off to sales');
      // Disable AI immediately on critical alert
      await supabase.from('leads').update({
        ai_conversation_enabled: false
      }).eq('id', lead_id);
      console.log('🚨 AI disabled - sending notifications...');
      try {
        // Fetch notification preferences
        const { data: notificationSettings } = await supabase.from('platform_settings').select('value').eq('key', 'ai_escalation_method').eq('tenant_id', tenant_id).maybeSingle();
        const notificationMethod = notificationSettings?.value || 'All';
        console.log('Notification method preference:', notificationMethod);
        // Fetch lead details for notifications
        const { data: lead } = await supabase.from('leads').select('name, phone, email, assigned_to_sales_team_id, campaign_id').eq('id', lead_id).single();
        // Fetch tenant details
        const { data: tenant } = await supabase.from('tenants').select('name, notification_email, notification_phone').eq('id', tenant_id).single();
        // Build notification message
        const priorityEmoji = alertPriority === 'critical' ? '🔴' : '⚪';
        const reasonDescriptions = {
          'ai_critical_score': 'AI detected high critical score',
          'agreed_to_meeting': 'Lead agreed to meeting',
          'requested_callback': 'Lead requested callback',
          'buying_signal': 'Strong buying signal detected',
          'timeline_urgent': 'Urgent timeline mentioned',
          'high_interest_question': 'Multiple high-interest questions',
          'explicit_timeline': 'Specific timeline mentioned',
          'pricing_inquiry': 'Sustained pricing inquiry with high motivation'
        };
        const primaryReason = reasonDescriptions[attentionReasons[0]] || attentionReasons[0];
        const notificationTitle = `${priorityEmoji} ${alertPriority.toUpperCase()} Lead Alert`;
        const notificationBody = `
Lead: ${lead?.name || 'Unknown'} (${lead?.phone})
Score: ${hotScore}/100 (${funnelStage})
Reason: ${primaryReason}
Engagement: ${inboundMessages.length} msgs, ${Math.round(durationMinutes)}min
Last Message: "${lastInboundMessage.substring(0, 100)}..."
        `.trim();
        const dashboardUrl = `${Deno.env.get('SUPABASE_URL')}/dashboard/leads/${lead_id}`;
        // Send notifications based on preference
        if (notificationMethod === 'All' || notificationMethod === 'SMS') {
          // SMS Notification via Twilio
          if (tenant?.notification_phone || lead?.assigned_to_sales_team_id) {
            const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
            const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
            const twilioFromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
            if (twilioSid && twilioToken && twilioFromNumber) {
              // Get assigned sales rep's phone if available
              let recipientPhone = tenant?.notification_phone;
              if (lead?.assigned_to_sales_team_id) {
                const { data: salesRep } = await supabase.from('users').select('phone').eq('id', lead.assigned_to_sales_team_id).single();
                if (salesRep?.phone) {
                  recipientPhone = salesRep.phone;
                }
              }
              if (recipientPhone) {
                const smsBody = `${notificationTitle}\n\n${notificationBody}\n\nView: ${dashboardUrl}`;
                try {
                  const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                      'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: new URLSearchParams({
                      From: twilioFromNumber,
                      To: recipientPhone,
                      Body: smsBody.substring(0, 1600) // SMS character limit
                    })
                  });
                  if (twilioResponse.ok) {
                    console.log('✅ SMS notification sent to:', recipientPhone);
                  } else {
                    console.error('❌ SMS notification failed:', await twilioResponse.text());
                  }
                } catch (smsError) {
                  console.error('❌ SMS notification error:', smsError);
                }
              }
            }
          }
        }
        if (notificationMethod === 'All' || notificationMethod === 'Email') {
          // Email Notification
          const recipientEmail = tenant?.notification_email || Deno.env.get('DEFAULT_NOTIFICATION_EMAIL');
          if (recipientEmail) {
            // Using Resend API
            const resendApiKey = Deno.env.get('RESEND_API_KEY');
            if (resendApiKey) {
              const emailHtml = `
                <h2>${notificationTitle}</h2>
                <p><strong>Lead:</strong> ${lead?.name || 'Unknown'} (${lead?.phone})</p>
                <p><strong>Score:</strong> ${hotScore}/100 (${funnelStage})</p>
                <p><strong>Reason:</strong> ${primaryReason}</p>
                <p><strong>Engagement:</strong> ${inboundMessages.length} messages over ${Math.round(durationMinutes)} minutes</p>
                <p><strong>Additional Triggers:</strong> ${attentionReasons.join(', ')}</p>
                <p><strong>Last Message:</strong> "${lastInboundMessage}"</p>
                <br>
                <p><a href="${dashboardUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Lead in Dashboard</a></p>
              `;
              try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${resendApiKey}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    from: 'onboarding@resend.dev',
                    to: recipientEmail,
                    subject: notificationTitle,
                    html: emailHtml,
                    text: notificationBody + `\n\nView: ${dashboardUrl}`
                  })
                });
                if (emailResponse.ok) {
                  console.log('✅ Email notification sent to:', recipientEmail);
                } else {
                  console.error('❌ Email notification failed:', await emailResponse.text());
                }
              } catch (emailError) {
                console.error('❌ Email notification error:', emailError);
              }
            }
          }
        }
        // Always log to notifications table for dashboard visibility
        const { error: notifError } = await supabase.from('notifications').insert({
          tenant_id,
          lead_id,
          type: 'lead_escalation',
          priority: alertPriority,
          title: notificationTitle,
          message: notificationBody,
          data: {
            hot_score: hotScore,
            funnel_stage: funnelStage,
            alert_triggers: criticalTriggers,
            attention_reasons: attentionReasons,
            last_message: lastInboundMessage,
            engagement_metrics: {
              inbound_count: inboundMessages.length,
              duration_minutes: Math.round(durationMinutes),
              has_minimum_engagement: hasMinimumEngagement
            }
          },
          read: false,
          created_at: new Date().toISOString()
        });
        if (notifError) {
          console.error('❌ Failed to log notification:', notifError);
        } else {
          console.log('✅ Notification logged to dashboard');
        }
        // Slack Integration (if configured)
        if (notificationMethod === 'All') {
          const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
          if (slackWebhookUrl) {
            const slackMessage = {
              text: notificationTitle,
              blocks: [
                {
                  type: "header",
                  text: {
                    type: "plain_text",
                    text: notificationTitle
                  }
                },
                {
                  type: "section",
                  fields: [
                    {
                      type: "mrkdwn",
                      text: `*Lead:*\n${lead?.name || 'Unknown'}`
                    },
                    {
                      type: "mrkdwn",
                      text: `*Phone:*\n${lead?.phone || 'N/A'}`
                    },
                    {
                      type: "mrkdwn",
                      text: `*Score:*\n${hotScore}/100`
                    },
                    {
                      type: "mrkdwn",
                      text: `*Stage:*\n${funnelStage}`
                    }
                  ]
                },
                {
                  type: "section",
                  text: {
                    type: "mrkdwn",
                    text: `*Reason:* ${primaryReason}\n*Engagement:* ${inboundMessages.length} msgs, ${Math.round(durationMinutes)}min\n*Last Message:* "${lastInboundMessage.substring(0, 200)}..."`
                  }
                },
                {
                  type: "actions",
                  elements: [
                    {
                      type: "button",
                      text: {
                        type: "plain_text",
                        text: "View in Dashboard"
                      },
                      url: dashboardUrl,
                      style: "primary"
                    }
                  ]
                }
              ]
            };
            try {
              const slackResponse = await fetch(slackWebhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(slackMessage)
              });
              if (slackResponse.ok) {
                console.log('✅ Slack notification sent');
              } else {
                console.error('❌ Slack notification failed');
              }
            } catch (slackError) {
              console.error('❌ Slack notification error:', slackError);
            }
          }
        }
        // Update lead with escalation timestamp
        await supabase.from('leads').update({
          last_escalated_at: new Date().toISOString(),
          escalation_reason: primaryReason,
          escalation_priority: alertPriority
        }).eq('id', lead_id);
      } catch (notificationError) {
        console.error('❌ Error in notification system:', notificationError);
      // Don't fail the whole scoring process if notifications fail
      }
    }
    return new Response(JSON.stringify({
      success: true,
      leadScores
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (e) {
    console.error('❌ score-lead error', e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      headers: corsHeaders,
      status: 500
    });
  }
});
