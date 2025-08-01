// supabase/functions/sync_sales_metrics/index.ts
import { createClient } from 'npm:@supabase/supabase-js';
import { serve } from 'https://deno.land/std@0.178.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'sync';
  const component = url.searchParams.get('component');
  const tenantId = url.searchParams.get('tenant_id');
  const period = url.searchParams.get('period') || '30days';

  try {
    if (action === 'sync') {
      return await handleSync(supabaseAdmin);
    } else if (action === 'fetch') {
      return await handleFetch(supabaseAdmin, component, tenantId, period);
    }

    return new Response(JSON.stringify({
      error: 'Invalid action. Use action=sync or action=fetch'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in sync_sales_metrics:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ================================
// COMPREHENSIVE SYNC FUNCTIONALITY
// ================================
async function handleSync(supabaseAdmin: any) {
  console.log('Starting comprehensive sales metrics sync...');
  
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // ================================
  // FETCH ALL REQUIRED DATA
  // ================================
  
  // Get all leads with comprehensive data
  const { data: leads, error: leadsError } = await supabaseAdmin
    .from('leads')
    .select(`
      id, tenant_id, name, phone, email, status, ai_status,
      created_at, last_contacted, disqualified_date, handoff_triggered,
      campaign, marked_hot_at, call_logged, first_call_at, last_call_at,
      ai_sent, ai_sent_at, last_message_at, last_interaction,
      estimated_pipeline_value, campaign_id, conversation_id,
      follow_up_stage, assigned_to_sales_team_id, escalation_reason,
      last_escalated_at, requested_followup_date
    `);

  if (leadsError) throw leadsError;

  // Get all messages for detailed conversation analysis
  const { data: messages, error: messagesError } = await supabaseAdmin
    .from('messages')
    .select(`
      id, tenant_id, lead_id, direction, message_body, sender,
      timestamp, phone, response_score, sentiment_score,
      sentiment_magnitude, openai_qualification_score,
      hesitation_score, urgency_score, weighted_score,
      ai_tone_used, retry_count, status
    `)
    .gte('timestamp', thirtyDaysAgo);

  if (messagesError) throw messagesError;

  // Get conversations
  const { data: conversations, error: conversationsError } = await supabaseAdmin
    .from('conversations')
    .select(`
      id, lead_id, tenant_id, status, current_lead_status,
      last_message_at, last_ai_engagement_at, overall_sentiment_score,
      created_at, campaign_id
    `)
    .gte('created_at', thirtyDaysAgo);

  if (conversationsError) throw conversationsError;

  // Get lead scores for AI performance analysis
  const { data: leadScores, error: leadScoresError } = await supabaseAdmin
    .from('lead_scores')
    .select(`
      lead_id, tenant_id, hot_score, total_responses, avg_reply_delay,
      avg_sentiment, sentiment_trend, urgency_score, motivation_score,
      hesitation_score, engagement_curve, funnel_stage, score_trajectory,
      requires_immediate_attention, alert_priority, computed_by, updated_at
    `);

  if (leadScoresError) throw leadScoresError;

  // Get lead journey for status transition analysis
  const { data: leadJourney, error: leadJourneyError } = await supabaseAdmin
    .from('lead_journey')
    .select(`
      id, tenant_id, lead_id, from_status, to_status, changed_at,
      duration_seconds, trigger_event, ai_confidence_score, sales_rep_email
    `)
    .gte('changed_at', thirtyDaysAgo);

  if (leadJourneyError) throw leadJourneyError;

  // Get AI conversation analytics
  const { data: aiAnalytics, error: aiAnalyticsError } = await supabaseAdmin
    .from('ai_conversation_analytics')
    .select(`
      id, tenant_id, lead_id, message_id, conversation_path,
      sentiment_score, keywords_triggered, ai_confidence, response_time_ms
    `)
    .gte('created_at', thirtyDaysAgo);

  if (aiAnalyticsError) throw aiAnalyticsError;

  // Get campaigns for performance analysis
  const { data: campaigns, error: campaignsError } = await supabaseAdmin
    .from('campaigns')
    .select(`
      id, tenant_id, name, ai_archetype_id, phone_number_id,
      ai_outreach_enabled, talk_track, service_type
    `);

  if (campaignsError) throw campaignsError;

  // Get phone numbers for deliverability analysis
  const { data: phoneNumbers, error: phoneNumbersError } = await supabaseAdmin
    .from('phone_numbers')
    .select('id, phone_number, tenant_id, status, capabilities');

  if (phoneNumbersError) throw phoneNumbersError;

  // Get bulk upload jobs for batch analysis
  const { data: uploadJobs, error: uploadJobsError } = await supabaseAdmin
    .from('bulk_upload_jobs')
    .select(`
      id, tenant_id, campaign_id, total_records, successful_records,
      failed_records, duplicate_records, created_at, completed_at,
      processing_time_seconds, campaign_name
    `)
    .gte('created_at', thirtyDaysAgo);

  if (uploadJobsError) throw uploadJobsError;

  // Get sales outcomes for revenue tracking
  const { data: salesOutcomes, error: salesOutcomesError } = await supabaseAdmin
    .from('sales_outcomes')
    .select(`
      id, tenant_id, lead_id, deal_amount, deal_stage,
      close_date, sales_rep_id, created_at
    `)
    .gte('created_at', thirtyDaysAgo);

  if (salesOutcomesError) throw salesOutcomesError;

  // Get experiments for A/B testing analysis
  const { data: experiments, error: experimentsError } = await supabaseAdmin
    .from('experiments')
    .select(`
      id, tenant_id, name, campaign_id, status, winner_variant,
      start_date, end_date, total_participants
    `);

  if (experimentsError) throw experimentsError;

  // Get experiment results
  const { data: experimentResults, error: experimentResultsError } = await supabaseAdmin
    .from('experiment_results')
    .select(`
      experiment_id, variant_id, lead_id, metric_value,
      tenant_id, outcome_type, recorded_at
    `)
    .gte('recorded_at', thirtyDaysAgo);

  if (experimentResultsError) throw experimentResultsError;

  // Get notifications for manual intervention tracking
  const { data: notifications, error: notificationsError } = await supabaseAdmin
    .from('notifications')
    .select(`
      id, tenant_id, lead_id, type, priority, read, created_at
    `)
    .gte('created_at', thirtyDaysAgo);

  if (notificationsError) throw notificationsError;

  // Get sales activities for call analysis
const { data: salesActivities, error: salesActivitiesError } = await supabaseAdmin
  .from('sales_activities')
  .select(`
    id, tenant_id, lead_id, activity_type, outcome, duration_seconds,
    notes, attempted_at, created_by, phone_number_used, metadata
  `)
  .gte('attempted_at', thirtyDaysAgo);

if (salesActivitiesError) throw salesActivitiesError;

  console.log(`Fetched data: ${(leads || []).length} leads, ${(messages || []).length} messages, ${(conversations || []).length} conversations`);

  // ================================
  // GROUP DATA BY TENANT
  // ================================
  
const dataByTenant = groupDataByTenant({
  leads: leads || [],
  messages: messages || [],
  conversations: conversations || [],
  leadScores: leadScores || [],
  leadJourney: leadJourney || [],
  aiAnalytics: aiAnalytics || [],
  campaigns: campaigns || [],
  phoneNumbers: phoneNumbers || [],
  uploadJobs: uploadJobs || [],
  salesOutcomes: salesOutcomes || [],
  experiments: experiments || [],
  experimentResults: experimentResults || [],
  notifications: notifications || [],
  salesActivities: salesActivities || []
});

  // ================================
  // PROCESS EACH TENANT'S METRICS
  // ================================
  
  const processingResults = [];

  for (const [tenantId, tenantData] of Object.entries(dataByTenant)) {
    console.log(`Processing tenant ${tenantId}...`);
    
    try {
      // Calculate comprehensive sales metrics
      const allSalesMetrics = [];

// 1. Tenant-level metrics (user_profile_id = null)
const tenantMetrics = calculateComprehensiveSalesMetrics(tenantData, today, null);
allSalesMetrics.push(tenantMetrics);

// 2. Individual user metrics  
const userGroups = tenantData.leads.reduce((acc, lead) => {
  const userId = lead.assigned_to_sales_team_id || 'unassigned';
  if (userId !== 'unassigned') {
    if (!acc[userId]) acc[userId] = [];
    acc[userId].push(lead);
  }
  return acc;
}, {});

for (const [userId, userLeads] of Object.entries(userGroups)) {
  // Filter all data arrays to only include data related to this user's leads
  const userLeadIds = userLeads.map((lead: any) => lead.id);
  
  const userData = {
    ...tenantData,
    leads: userLeads,
    messages: tenantData.messages.filter((msg: any) => 
      userLeadIds.includes(msg.lead_id)
    ),
    conversations: tenantData.conversations.filter((conv: any) => 
      userLeadIds.includes(conv.lead_id)
    ),
    leadScores: tenantData.leadScores.filter((score: any) => 
      userLeadIds.includes(score.lead_id)
    ),
    leadJourney: tenantData.leadJourney.filter((journey: any) => 
      userLeadIds.includes(journey.lead_id)
    ),
    aiAnalytics: tenantData.aiAnalytics.filter((ai: any) => 
      userLeadIds.includes(ai.lead_id)
    ),
    salesOutcomes: tenantData.salesOutcomes.filter((outcome: any) => 
      userLeadIds.includes(outcome.lead_id)
    ),
    notifications: tenantData.notifications.filter((notif: any) => 
      userLeadIds.includes(notif.lead_id)
    ),
    // Keep shared resources unfiltered (these are tenant-wide)
    campaigns: tenantData.campaigns,
    phoneNumbers: tenantData.phoneNumbers,
    uploadJobs: tenantData.uploadJobs,
    experiments: tenantData.experiments,
    experimentResults: tenantData.experimentResults
  };
  
  const userMetrics = calculateComprehensiveSalesMetrics(userData, today, userId);
  allSalesMetrics.push(userMetrics);
}
      
      // Calculate detailed conversation analytics
      const conversationAnalytics = calculateDetailedConversationAnalytics(tenantData, today);

      // Insert/update sales metrics
const { error: salesMetricsError } = await supabaseAdmin
  .from('sales_metrics')
  .upsert(allSalesMetrics, {
          onConflict: 'tenant_id,user_profile_id,metric_date,period_type'
        });

      if (salesMetricsError) {
        console.error(`Error upserting sales metrics for tenant ${tenantId}:`, salesMetricsError);
        throw salesMetricsError;
      }

      // Insert/update conversation analytics (batch insert)
      if (conversationAnalytics.length > 0) {
        const { error: conversationAnalyticsError } = await supabaseAdmin
          .from('conversation_analytics')
          .upsert(conversationAnalytics, {
            onConflict: 'conversation_id,sales_metric_date'
          });

        if (conversationAnalyticsError) {
          console.error(`Error upserting conversation analytics for tenant ${tenantId}:`, conversationAnalyticsError);
          throw conversationAnalyticsError;
        }
      }

      processingResults.push({
        tenant_id: tenantId,
        sales_metrics_updated: true,
        conversation_analytics_count: conversationAnalytics.length,
        total_leads: tenantData.leads.length,
        total_messages: tenantData.messages.length
      });

      console.log(`Successfully processed tenant ${tenantId}: ${tenantData.leads.length} leads, ${conversationAnalytics.length} conversation analytics`);

    } catch (error: any) {
      console.error(`Error processing tenant ${tenantId}:`, error);
      processingResults.push({
        tenant_id: tenantId,
        error: error.message,
        total_leads: tenantData.leads.length,
        total_messages: tenantData.messages.length
      });
    }
  }

  return new Response(JSON.stringify({
    success: true,
    message: `Comprehensive sales metrics synced for ${Object.keys(dataByTenant).length} tenant(s)`,
    date: today,
    results: processingResults
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ================================
// DATA GROUPING HELPER
// ================================
function groupDataByTenant(allData: any) {
  const grouped: any = {};

  // Group all data by tenant_id
  Object.entries(allData).forEach(([dataType, dataArray]) => {
    (dataArray as any[]).forEach((item: any) => {
      const tenantId = item.tenant_id || 'default';
      
      if (!grouped[tenantId]) {
grouped[tenantId] = {
  leads: [],
  messages: [],
  conversations: [],
  leadScores: [],
  leadJourney: [],
  aiAnalytics: [],
  campaigns: [],
  phoneNumbers: [],
  uploadJobs: [],
  salesOutcomes: [],
  experiments: [],
  experimentResults: [],
  notifications: [],
  salesActivities: []
};
      }
      
      grouped[tenantId][dataType].push(item);
    });
  });

  return grouped;
}

// ================================
// COMPREHENSIVE SALES METRICS CALCULATION
// ================================
function calculateComprehensiveSalesMetrics(tenantData: any, metricDate: string, userProfileId: string | null = null) {
  const {
    leads, messages, conversations, leadScores, leadJourney,
    aiAnalytics, campaigns, phoneNumbers, uploadJobs, 
    salesOutcomes, experiments, experimentResults, notifications,
    salesActivities
  } = tenantData;

  // Basic lead metrics
  const totalLeadsAssigned = leads.length;
  const hotLeads = leads.filter((lead: any) => 
    lead.status === 'hot' || lead.ai_status === 'hot' || lead.marked_hot_at !== null
  ).length;

  const leadsContacted = leads.filter((lead: any) => 
    lead.last_contacted !== null || lead.last_interaction !== null
  ).length;

  const conversions = salesOutcomes.length || leads.filter((lead: any) => 
    lead.status === 'converted' || lead.status === 'customer' || lead.status === 'closed-won'
  ).length;

  // AI Performance Metrics
  const aiConversationsStarted = leads.filter((lead: any) => 
    lead.ai_sent === true || lead.ai_sent_at !== null
  ).length;

  const aiSuccessfulHandshakes = messages.filter((msg: any) => 
    msg.direction === 'inbound' && (msg.response_score || 0) > 0
  ).length;

  const aiFailures = messages.filter((msg: any) => 
    msg.status === 'failed' || (msg.retry_count || 0) > 0
  ).length;

  const aiOnlyClosures = salesOutcomes.filter((outcome: any) => {
    const lead = leads.find((l: any) => l.id === outcome.lead_id);
    return lead && !lead.call_logged && lead.ai_sent;
  }).length;

  // Manual intervention metrics
  const manualSmsSent = messages.filter((msg: any) => 
    msg.direction === 'outbound' && !msg.ai_tone_used
  ).length;

  const manualCallsMade = leads.filter((lead: any) => 
    lead.call_logged === true || lead.first_call_at !== null
  ).length;

  const manualInterventions = notifications.filter((notif: any) => 
    notif.type === 'manual_intervention' || notif.type === 'escalation'
  ).length;

  const manualNotesAdded = notifications.filter((notif: any) => 
    notif.type === 'note_added'
  ).length;

  // Escalation metrics
  const escalationCount = leads.filter((lead: any) => lead.last_escalated_at !== null).length;
  const escalationIgnored = notifications.filter((notif: any) => 
    notif.type === 'escalation' && !notif.read
  ).length;
  const escalationAcknowledged = notifications.filter((notif: any) => 
    notif.type === 'escalation' && notif.read
  ).length;

  // Disqualification tracking
  const disqualifiedByAi = leads.filter((lead: any) => 
    lead.status === 'disqualified' && lead.ai_status !== null
  ).length;

  const disqualifiedByHuman = leads.filter((lead: any) => 
    lead.status === 'disqualified' && lead.disqualified_date !== null
  ).length;

  // Conversation metrics
  const totalMessages = messages.length;
  const avgConversationLength = conversations.length > 0 ? 
    messages.length / conversations.length : 0;

  const conversationRestarts = leadJourney.filter((journey: any) => 
    journey.trigger_event === 'conversation_restart'
  ).length;

  const conversationDropoffRate = conversations.length > 0 ? 
    conversations.filter((conv: any) => conv.status === 'dropped').length / conversations.length : 0;

  // Timing metrics
  const responseMessages = messages.filter((msg: any) => 
    msg.direction === 'inbound' && msg.response_score !== null
  );

  const avgResponseTime = responseMessages.length > 0 ? 
    responseMessages.reduce((sum: number, msg: any) => {
      const lead = leads.find((l: any) => l.id === msg.lead_id);
      if (lead && lead.last_contacted) {
        const responseTime = new Date(msg.timestamp).getTime() - new Date(lead.last_contacted).getTime();
        return sum + responseTime;
      }
      return sum;
    }, 0) / responseMessages.length / 1000 : 0; // Convert to seconds

  // Calculate average time to hot
  const hotLeadTimes = leads.filter((lead: any) => lead.marked_hot_at !== null)
    .map((lead: any) => {
      const createdTime = new Date(lead.created_at).getTime();
      const hotTime = new Date(lead.marked_hot_at).getTime();
      return Math.floor((hotTime - createdTime) / (1000 * 60 * 60)); // Hours
    });

  const avgTimeToHot = hotLeadTimes.length > 0 ? 
    `${Math.floor(hotLeadTimes.reduce((sum, time) => sum + time, 0) / hotLeadTimes.length)} hours` : null;

  // Calculate conversion timing
  const convertedLeads = salesOutcomes.map((outcome: any) => {
    const lead = leads.find((l: any) => l.id === outcome.lead_id);
    if (lead) {
      const created = new Date(lead.created_at);
      const converted = new Date(outcome.close_date || outcome.created_at);
      return Math.floor((converted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }
    return 0;
  }).filter((days: number) => days > 0);

  const avgDaysToConversion = convertedLeads.length > 0 ? 
    convertedLeads.reduce((sum: number, days: number) => sum + days, 0) / convertedLeads.length : 0;

  // Reply rate calculation
  const outboundMessages = messages.filter((msg: any) => msg.direction === 'outbound').length;
  const inboundMessages = messages.filter((msg: any) => msg.direction === 'inbound').length;
  const replyRate = outboundMessages > 0 ? inboundMessages / outboundMessages : 0;

  // Pipeline and revenue metrics
  const totalPipelineValue = salesOutcomes.reduce((sum: number, outcome: any) => 
    sum + (outcome.deal_amount || 0), 0
  );

  const leadLtvEstimate = conversions > 0 ? totalPipelineValue / conversions : 0;

  // Touchpoints analysis
  const leadsWithMessages = leads.filter((lead: any) => 
    messages.some((msg: any) => msg.lead_id === lead.id)
  );

  const touchpointsPerConversion = conversions > 0 ? 
    leadsWithMessages.reduce((sum: number, lead: any) => {
      const leadMessages = messages.filter((msg: any) => msg.lead_id === lead.id);
      return sum + leadMessages.length;
    }, 0) / conversions : 0;

  // AI recommendation accuracy
  const aiRecommendations = aiAnalytics.filter((analytics: any) => 
    (analytics.ai_confidence || 0) > 0.7
  );
  
  const correctRecommendations = aiRecommendations.filter((analytics: any) => {
    const lead = leads.find((l: any) => l.id === analytics.lead_id);
    return lead && lead.status === 'hot';
  });

  const aiRecommendationAccuracy = aiRecommendations.length > 0 ? 
    correctRecommendations.length / aiRecommendations.length : 0;

  // Campaign performance
  const campaignsHandled = new Set(leads.map((lead: any) => lead.campaign_id).filter(Boolean)).size;

  // Phone number performance
  const phoneNumberPerformance = phoneNumbers.length > 0 ? 
    phoneNumbers.reduce((sum: number, phone: any) => {
      const phoneMessages = messages.filter((msg: any) => msg.phone === phone.phone_number);
      const deliveredMessages = phoneMessages.filter((msg: any) => msg.status === 'delivered');
      return sum + (phoneMessages.length > 0 ? deliveredMessages.length / phoneMessages.length : 0);
    }, 0) / phoneNumbers.length : 0;

  // Upload batch quality
  const batchQuality = uploadJobs.length > 0 ? 
    uploadJobs.reduce((sum: number, job: any) => {
      return sum + (job.total_records > 0 ? job.successful_records / job.total_records : 0);
    }, 0) / uploadJobs.length : 0;

  // Content analysis
  const keywords = [...new Set(
    messages.flatMap((msg: any) => extractKeywords(msg.message_body || ''))
  )];

  const hotTriggerPhrases = [...new Set(
    messages.filter((msg: any) => {
      const lead = leads.find((l: any) => l.id === msg.lead_id);
      return lead && lead.marked_hot_at !== null;
    }).flatMap((msg: any) => extractTriggerPhrases(msg.message_body || ''))
  )];

  const optOutReasons = messages.filter((msg: any) => 
    msg.message_body && msg.message_body.toLowerCase().includes('stop')
  ).map(() => 'STOP command'); // Simplified

  // Sentiment analysis
  const sentimentMessages = messages.filter((msg: any) => msg.sentiment_score !== null);
  const sentimentBreakdown = sentimentMessages.reduce((acc: any, msg: any) => {
    if ((msg.sentiment_score || 0) > 0.1) acc.positive++;
    else if ((msg.sentiment_score || 0) < -0.1) acc.negative++;
    else acc.neutral++;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });

  // Industry and lead source analysis
  const industryType = campaigns.length > 0 ? campaigns[0].service_type : null;
  const leadSourceQuality = batchQuality;

  // Predictive metrics
  const leadScoresTrending = leadScores.filter((score: any) => (score.score_trajectory || 0) > 0).length;
  const leadScoreTrendDirection = leadScoresTrending > leadScores.length / 2 ? 'improving' : 
    leadScoresTrending < leadScores.length / 4 ? 'declining' : 'stable';

  // Cost metrics (placeholder - would need actual cost data)
  const campaignCost = 0; // Would come from billing/cost tracking
  const costPerHotLead = hotLeads > 0 ? campaignCost / hotLeads : 0;
  const customerAcquisitionCost = conversions > 0 ? campaignCost / conversions : 0;

  // Message template performance
  const templatePerformance = messages.reduce((acc: any, msg: any) => {
    const template = msg.ai_tone_used || 'default';
    if (!acc[template]) {
      acc[template] = { sent: 0, responded: 0 };
    }
    acc[template].sent++;
    if ((msg.response_score || 0) > 0) {
      acc[template].responded++;
    }
    return acc;
  }, {});

  // Time-based patterns
  const timeBasedPatterns = messages.reduce((acc: any, msg: any) => {
    const hour = new Date(msg.timestamp).getHours();
    
    if (!acc[hour]) acc[hour] = 0;
    if ((msg.response_score || 0) > 0) acc[hour]++;
    
    return acc;
  }, {});

  // ✅ NEW: Call Analytics Calculations
const callActivities = salesActivities.filter((activity: any) => activity.activity_type === 'call');
const hotLeadsWithCalls = leads.filter((lead: any) => {
  const hasHotMarking = lead.marked_hot_at !== null;
  const hasCallActivity = callActivities.some((call: any) => call.lead_id === lead.id);
  return hasHotMarking && hasCallActivity;
});

// Calculate avg calls per hot lead
const avgCallsPerHotLead = hotLeads > 0 ? callActivities.length / hotLeads : 0;

// Calculate first call response rate
const firstCallAttempts = hotLeadsWithCalls.map((lead: any) => {
  const leadCalls = callActivities
    .filter((call: any) => call.lead_id === lead.id)
    .sort((a: any, b: any) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime());
  return leadCalls[0];
}).filter(Boolean);

const successfulFirstCalls = firstCallAttempts.filter((call: any) => 
  call.outcome === 'connected' || call.outcome === 'qualified'
).length;

const firstCallResponseRate = firstCallAttempts.length > 0 ? 
  successfulFirstCalls / firstCallAttempts.length : 0;

// Calculate call persistence score
const callAttemptCounts = hotLeadsWithCalls.map((lead: any) => 
  callActivities.filter((call: any) => call.lead_id === lead.id).length
);
const callPersistenceScore = callAttemptCounts.length > 0 ? 
  callAttemptCounts.reduce((sum: number, count: number) => sum + count, 0) / callAttemptCounts.length : 0;

// Calculate avg time from hot to first call
const hotToFirstCallTimes = hotLeadsWithCalls.map((lead: any) => {
  const hotTime = new Date(lead.marked_hot_at).getTime();
  const firstCall = callActivities
    .filter((call: any) => call.lead_id === lead.id)
    .sort((a: any, b: any) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime())[0];
  
  if (firstCall) {
    const callTime = new Date(firstCall.attempted_at).getTime();
    return Math.floor((callTime - hotTime) / (1000 * 60)); // minutes
  }
  return null;
}).filter((time: number | null) => time !== null);

const avgTimeHotToFirstCall = hotToFirstCallTimes.length > 0 ? 
  hotToFirstCallTimes.reduce((sum: number, time: number) => sum + time, 0) / hotToFirstCallTimes.length : 0;

// Calculate call outcome distribution
const callOutcomeDistribution = callActivities.reduce((acc: any, call: any) => {
  const outcome = call.outcome || 'unknown';
  acc[outcome] = (acc[outcome] || 0) + 1;
  return acc;
}, {});

// Calculate calls per conversion
const avgCallsPerConversion = conversions > 0 ? callActivities.length / conversions : 0;

// Calculate call to pipeline ratio
const totalPipelineFromCalls = callActivities.reduce((sum: number, call: any) => {
  const pipelineValue = call.metadata?.pipeline_value || 0;
  return sum + pipelineValue;
}, 0);
const callToPipelineRatio = callActivities.length > 0 ? totalPipelineFromCalls / callActivities.length : 0;

// Calculate multi-touch call success rate
const multiTouchLeads = hotLeadsWithCalls.filter((lead: any) => 
  callActivities.filter((call: any) => call.lead_id === lead.id).length > 1
);
const successfulMultiTouchLeads = multiTouchLeads.filter((lead: any) => 
  callActivities.some((call: any) => 
    call.lead_id === lead.id && (call.outcome === 'connected' || call.outcome === 'qualified')
  )
);
const multiTouchCallSuccessRate = multiTouchLeads.length > 0 ? 
  successfulMultiTouchLeads.length / multiTouchLeads.length : 0;

// Calculate rep-specific metrics (when userProfileId is provided)
let repCallConnectRate = 0;
let repAvgCallOutcomeTime = 0;

if (userProfileId) {
  const repCalls = callActivities.filter((call: any) => call.created_by === userProfileId);
  const repConnectedCalls = repCalls.filter((call: any) => 
    call.outcome === 'connected' || call.outcome === 'qualified'
  );
  repCallConnectRate = repCalls.length > 0 ? repConnectedCalls.length / repCalls.length : 0;
  
  // Calculate avg time between call attempts for this rep
  if (repCalls.length > 1) {
    const repCallTimes = repCalls
      .sort((a: any, b: any) => new Date(a.attempted_at).getTime() - new Date(b.attempted_at).getTime())
      .map((call: any) => new Date(call.attempted_at).getTime());
    
    const intervals = [];
    for (let i = 1; i < repCallTimes.length; i++) {
      intervals.push(repCallTimes[i] - repCallTimes[i-1]);
    }
    
    repAvgCallOutcomeTime = intervals.length > 0 ? 
      intervals.reduce((sum: number, interval: number) => sum + interval, 0) / intervals.length / (1000 * 60) : 0; // minutes
  }
}

  // Calculate representative phone number and batch IDs
  const primaryPhoneNumberId = phoneNumbers.length > 0 ? phoneNumbers[0].id : null;
  const primaryBatchId = uploadJobs.length > 0 ? uploadJobs[0].id : null;
  const primaryCampaignId = campaigns.length > 0 ? campaigns[0].id : null;
  const primaryExperimentId = experiments.length > 0 ? experiments[0].id : null;

  return {
    tenant_id: tenantData.leads[0]?.tenant_id || null,
    user_profile_id: userProfileId,// Would need to be passed in or derived
    metric_date: metricDate,
    period_type: 'daily',
    
    // Core metrics
    total_leads_assigned: totalLeadsAssigned,
    leads_contacted: leadsContacted,
    hot_leads: hotLeads,
    ai_conversations_started: aiConversationsStarted,
    ai_successful_handshakes: aiSuccessfulHandshakes,
    conversion_count: conversions,
    avg_time_to_hot: avgTimeToHot,
    avg_response_time: `${Math.floor(avgResponseTime)} seconds`,
    reply_rate: replyRate,
    escalation_count: escalationCount,
    manual_interventions: manualInterventions,
    ai_only_closures: aiOnlyClosures,
    
    // Enhanced metrics
    manual_sms_sent: manualSmsSent,
    manual_calls_made: manualCallsMade,
    ai_failures: aiFailures,
    avg_days_to_conversion: avgDaysToConversion,
    reassigned_leads_count: 0, // Would need reassignment tracking
    conversation_dropoff_rate: conversationDropoffRate,
    avg_conversation_length: avgConversationLength,
    conversation_restarts: conversationRestarts,
    manual_notes_added: manualNotesAdded,
    escalation_ignored_count: escalationIgnored,
    escalation_acknowledged_count: escalationAcknowledged,
    campaigns_handled_count: campaignsHandled,
    lead_ltv_estimate: leadLtvEstimate,
    touchpoints_per_conversion: touchpointsPerConversion,
    ai_recommendation_accuracy: aiRecommendationAccuracy,
    rep_response_time_to_alerts: 0, // Would need alert response tracking
    disqualified_by_ai: disqualifiedByAi,
    disqualified_by_human: disqualifiedByHuman,
    status_conflicts_resolved: 0, // Would need conflict tracking
    ai_override_actions: 0, // Would need override tracking
    total_pipeline_value: totalPipelineValue,
    
    // JSON fields
    keywords: JSON.stringify(keywords),
    hot_trigger_phrases: JSON.stringify(hotTriggerPhrases),
    opt_out_reasons: JSON.stringify(optOutReasons),
    sentiment_breakdown: JSON.stringify(sentimentBreakdown),
    custom_metrics: JSON.stringify({
      total_messages: totalMessages,
      avg_sentiment: sentimentMessages.length > 0 ? 
        sentimentMessages.reduce((sum: number, msg: any) => sum + (msg.sentiment_score || 0), 0) / sentimentMessages.length : 0
    }),
    
    // New enhanced fields
    phone_number_id: primaryPhoneNumberId,
    batch_id: primaryBatchId,
    campaign_id: primaryCampaignId,
    experiment_id: primaryExperimentId,
    industry_type: industryType,
    lead_source_quality_score: leadSourceQuality,
    upload_batch_quality_score: batchQuality,
    phone_number_performance_score: phoneNumberPerformance,
    optimal_contact_hour: getOptimalContactHour(timeBasedPatterns),
    avg_messages_to_hot: hotLeads > 0 ? totalMessages / hotLeads : 0,
    follow_up_sequence_effectiveness: replyRate,
    conversation_restart_success_rate: conversationRestarts > 0 ? 
      conversions / conversationRestarts : 0,
    opt_out_rate: totalMessages > 0 ? 
      optOutReasons.length / totalMessages : 0,
    message_delivery_rate: phoneNumberPerformance,
    spam_complaint_rate: 0, // Would need complaint tracking
    carrier_filtering_rate: 1 - phoneNumberPerformance,
    campaign_cost: campaignCost,
    cost_per_hot_lead: costPerHotLead,
    roi_percentage: campaignCost > 0 ? 
      (totalPipelineValue - campaignCost) / campaignCost * 100 : 0,
    customer_acquisition_cost: customerAcquisitionCost,
    lead_score_trend_direction: leadScoreTrendDirection,
    churn_risk_score: 0, // Would need churn modeling
    pipeline_velocity_score: avgDaysToConversion > 0 ? 
      1 / avgDaysToConversion : 0,
    conversion_probability_avg: conversions > 0 ? 
      conversions / totalLeadsAssigned : 0,
    
    // Enhanced JSON fields
    message_template_performance: JSON.stringify(templatePerformance),
    time_based_patterns: JSON.stringify(timeBasedPatterns),
    deliverability_details: JSON.stringify({
      phone_numbers_used: phoneNumbers.length,
      total_messages_sent: totalMessages,
      delivery_rate: phoneNumberPerformance
    }),
    engagement_depth_metrics: JSON.stringify({
      avg_conversation_length: avgConversationLength,
      response_rate: replyRate,
      escalation_rate: escalationCount / totalLeadsAssigned
    }),
    multi_touch_attribution: JSON.stringify({
      avg_touchpoints: touchpointsPerConversion,
      conversion_paths: [] // Would need path analysis
    }),
    
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// ================================
// DETAILED CONVERSATION ANALYTICS CALCULATION
// ================================
function calculateDetailedConversationAnalytics(tenantData: any, metricDate: string) {
  const { leads, messages, conversations, leadScores, aiAnalytics, campaigns, phoneNumbers, uploadJobs, experiments } = tenantData;
  
  const analyticsResults = [];

  for (const conversation of conversations) {
    const lead = leads.find((l: any) => l.id === conversation.lead_id);
    if (!lead) continue;

    const conversationMessages = messages.filter((msg: any) => msg.lead_id === conversation.lead_id);
    const leadScore = leadScores.find((score: any) => score.lead_id === conversation.lead_id);
    const conversationAI = aiAnalytics.filter((ai: any) => ai.lead_id === conversation.lead_id);
    const campaign = campaigns.find((c: any) => c.id === conversation.campaign_id);
    
    if (conversationMessages.length === 0) continue;

    // Basic conversation metrics
    const messageCount = conversationMessages.length;
    const conversationStart = new Date(conversationMessages[0].timestamp);
    const conversationEnd = new Date(conversationMessages[conversationMessages.length - 1].timestamp);
    const conversationDurationMinutes = Math.floor((conversationEnd.getTime() - conversationStart.getTime()) / (1000 * 60));

    // Handoff analysis
    const handoffOccurred = lead.handoff_triggered || false;
    const handoffTimestamp = lead.last_escalated_at || null;

    // Message sequence analysis
    const outboundMessages = conversationMessages.filter((msg: any) => msg.direction === 'outbound');
    const inboundMessages = conversationMessages.filter((msg: any) => msg.direction === 'inbound');
    const messageSequencePosition = outboundMessages.length;

    // Content analysis
    const allMessageText = conversationMessages.map((msg: any) => msg.message_body || '').join(' ');
    const keywords = extractKeywords(allMessageText);
    const highIntentKeywords = keywords.filter((keyword: string) => 
      ['pricing', 'demo', 'trial', 'buy', 'purchase', 'cost'].includes(keyword.toLowerCase())
    );
    const triggerPhrases = extractTriggerPhrases(allMessageText);

    // Sentiment analysis
    const sentimentMessages = conversationMessages.filter((msg: any) => msg.sentiment_score !== null);
    const avgSentiment = sentimentMessages.length > 0 ? 
      sentimentMessages.reduce((sum: number, msg: any) => sum + (msg.sentiment_score || 0), 0) / sentimentMessages.length : 0;
    
    const sentimentClassification = avgSentiment > 0.1 ? 'positive' : 
      avgSentiment < -0.1 ? 'negative' : 'neutral';

    // Intent classification
    const hasQuestion = allMessageText.includes('?');
    const hasPricing = highIntentKeywords.length > 0;
    const intentClassification = hasPricing ? 'high_intent' : 
      hasQuestion ? 'information_seeking' : 'general';

    // Timing analysis
    const firstOutbound = outboundMessages[0];
    const firstInbound = inboundMessages[0];
    const timeToFirstResponseSeconds = firstOutbound && firstInbound ? 
      Math.floor((new Date(firstInbound.timestamp).getTime() - new Date(firstOutbound.timestamp).getTime()) / 1000) : null;

    const timeToHotMinutes = lead.marked_hot_at ? 
      Math.floor((new Date(lead.marked_hot_at).getTime() - conversationStart.getTime()) / (1000 * 60)) : null;

    // AI effectiveness
    const aiEffectivenessScore = conversationAI.length > 0 ? 
      conversationAI.reduce((sum: number, ai: any) => sum + (ai.ai_confidence || 0), 0) / conversationAI.length : 0;

    // Message template analysis
    const templatesUsed = [...new Set(conversationMessages.map((msg: any) => msg.ai_tone_used).filter(Boolean))];
    const messageTemplateUsed = templatesUsed.length > 0 ? templatesUsed[0] : null;

    // Engagement depth scoring
    const questionCount = conversationMessages.filter((msg: any) => 
      msg.message_body && msg.message_body.includes('?')
    ).length;
    
    const avgMessageLength = conversationMessages.reduce((sum: number, msg: any) => 
      sum + (msg.message_body ? msg.message_body.length : 0), 0) / messageCount;
    
    const engagementDepthScore = Math.min(10, 
      (questionCount * 2) + 
      (inboundMessages.length / outboundMessages.length * 3) + 
      (avgMessageLength / 50)
    );

    // Behavioral patterns
    const responseHours = inboundMessages.map((msg: any) => new Date(msg.timestamp).getHours());
    const avgResponseHour = responseHours.length > 0 ? 
      Math.round(responseHours.reduce((sum: number, hour: number) => sum + hour, 0) / responseHours.length) : null;
    
    const responseDays = inboundMessages.map((msg: any) => new Date(msg.timestamp).getDay());
    const weekendResponses = responseDays.filter((day: number) => day === 0 || day === 6).length;
    const weekendResponse = weekendResponses > 0;
    
    const businessHoursResponse = responseHours.filter((hour: number) => hour >= 9 && hour <= 17).length > 0;

    // Final outcome analysis
    const finalOutcome = lead.status === 'converted' ? 'converted' :
      lead.status === 'disqualified' ? 'disqualified' :
      allMessageText.toLowerCase().includes('stop') ? 'opted_out' : 'active';

    // Response timing category
    const avgResponseTimeMs = timeToFirstResponseSeconds ? timeToFirstResponseSeconds * 1000 : 0;
    const responseTimeCategory = avgResponseTimeMs < 300000 ? 'immediate' : // < 5 min
      avgResponseTimeMs < 3600000 ? 'fast' : // < 1 hour
      avgResponseTimeMs < 86400000 ? 'moderate' : 'slow'; // < 1 day

    // AI model information
    const aiModelVersion = 'v1.0'; // Would come from AI system
    const aiArchetypeUsed = campaign?.ai_archetype_id || null;

    // Compliance and deliverability
    const messageDeliveryStatus = conversationMessages.every((msg: any) => msg.status === 'delivered') ? 'delivered' : 'partial';
    const carrierFiltered = conversationMessages.some((msg: any) => msg.status === 'failed');
    const optOutTriggered = allMessageText.toLowerCase().includes('stop');

    // Get related IDs
    const phoneNumberId = phoneNumbers.find((pn: any) => 
      conversationMessages.some((msg: any) => msg.phone === pn.phone_number)
    )?.id || null;
    
    const batchId = uploadJobs.length > 0 ? uploadJobs[0].id : null;
    const experimentId = experiments.find((exp: any) => exp.campaign_id === conversation.campaign_id)?.id || null;

    analyticsResults.push({
      tenant_id: conversation.tenant_id,
      conversation_id: conversation.id,
      sales_metric_date: metricDate,
      analyzed_at: new Date().toISOString(),
      
      // Basic metrics
      message_count: messageCount,
      conversation_duration_minutes: conversationDurationMinutes,
      conversation_status: conversation.status,
      handoff_occurred: handoffOccurred,
      handoff_timestamp: handoffTimestamp,
      
      // Content analysis
      keywords_detected: JSON.stringify(keywords),
      high_intent_keywords: JSON.stringify(highIntentKeywords),
      trigger_phrases: JSON.stringify(triggerPhrases),
      sentiment_score: avgSentiment,
      sentiment_classification: sentimentClassification,
      intent_classification: intentClassification,
      confidence_score: 0.95,
      
      // Outcomes
      escalation_reason: lead.escalation_reason || null,
      opt_out_reason: optOutTriggered ? 'STOP command' : null,
      conversion_trigger: finalOutcome === 'converted' ? 'ai_qualification' : null,
      drop_off_stage: finalOutcome === 'disqualified' ? 'qualification' : null,
      
      // Timing
      time_to_first_response_seconds: timeToFirstResponseSeconds,
      time_to_hot_minutes: timeToHotMinutes,
      ai_effectiveness_score: aiEffectivenessScore,
      
      // Enhanced fields
      phone_number_id: phoneNumberId,
      batch_id: batchId,
      campaign_id: conversation.campaign_id,
      experiment_id: experimentId,
      lead_id: conversation.lead_id,
      
      // Message sequence
      message_sequence_position: messageSequencePosition,
      total_messages_in_sequence: messageCount,
      follow_up_stage: lead.follow_up_stage || 0,
      is_conversation_restart: false, // Would need restart detection logic
      
      // Template and content
      message_template_used: messageTemplateUsed,
      ai_archetype_used: aiArchetypeUsed,
      message_length: Math.round(avgMessageLength),
      question_count: questionCount,
      response_word_count: inboundMessages.reduce((sum: number, msg: any) => 
        sum + (msg.message_body ? msg.message_body.split(' ').length : 0), 0),
      
      // Engagement
      engagement_depth_score: engagementDepthScore,
      topic_progression_score: Math.min(10, keywords.length),
      objection_handled: allMessageText.toLowerCase().includes('but') || allMessageText.toLowerCase().includes('however'),
      value_prop_discussed: highIntentKeywords.length > 0,
      next_steps_established: allMessageText.toLowerCase().includes('next') || allMessageText.toLowerCase().includes('follow'),
      
      // Behavioral patterns
      response_time_category: responseTimeCategory,
      response_day_of_week: responseDays.length > 0 ? responseDays[0] : null,
      response_hour_of_day: avgResponseHour,
      weekend_response: weekendResponse,
      business_hours_response: businessHoursResponse,
      
      // AI performance
      ai_model_version: aiModelVersion,
      ai_decision_confidence: aiEffectivenessScore,
      ai_prediction_accuracy: finalOutcome === 'converted' ? 1.0 : 0.5,
      manual_override_occurred: false, // Would need override tracking
      manual_override_reason: null,
      
      // Attribution
      conversion_attribution_weight: finalOutcome === 'converted' ? 1.0 : 0.0,
      touchpoint_sequence_number: messageSequencePosition,
      final_outcome: finalOutcome,
      outcome_confidence_score: 0.9,
      
      // Compliance
      message_delivery_status: messageDeliveryStatus,
      carrier_filtered: carrierFiltered,
      opt_out_triggered: optOutTriggered,
      spam_risk_score: 0.1, // Would need spam detection
      compliance_score: 1.0,
      
      // JSON fields
      behavioral_patterns: JSON.stringify({
        response_hours: responseHours,
        avg_response_hour: avgResponseHour,
        weekend_activity: weekendResponse
      }),
      content_analysis: JSON.stringify({
        keywords: keywords,
        trigger_phrases: triggerPhrases,
        sentiment_progression: sentimentMessages.map((msg: any) => msg.sentiment_score)
      }),
      ai_decision_tree: JSON.stringify({
        confidence_scores: conversationAI.map((ai: any) => ai.ai_confidence),
        decision_points: conversationAI.map((ai: any) => ai.conversation_path)
      }),
      engagement_timeline: JSON.stringify({
        message_timestamps: conversationMessages.map((msg: any) => msg.timestamp),
        engagement_scores: conversationMessages.map((msg: any) => msg.response_score || 0)
      }),
      predictive_indicators: JSON.stringify({
        conversion_signals: highIntentKeywords,
        churn_signals: optOutTriggered ? ['opt_out'] : [],
        engagement_trend: 'stable' // Would need trend analysis
      }),
      
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: null
    });
  }

  return analyticsResults;
}

// ================================
// HELPER FUNCTIONS
// ================================
function extractKeywords(text: string): string[] {
  if (!text) return [];
  
  const commonKeywords = [
    'pricing', 'price', 'cost', 'demo', 'trial', 'buy', 'purchase',
    'interested', 'schedule', 'meeting', 'call', 'enterprise',
    'integration', 'features', 'benefits', 'solution', 'service',
    'help', 'support', 'question', 'information', 'details'
  ];
  
  const words = text.toLowerCase().split(/\W+/);
  return commonKeywords.filter(keyword => words.includes(keyword));
}

function extractTriggerPhrases(text: string): string[] {
  if (!text) return [];
  
  const triggerPhrases = [
    'what does it cost',
    'how much is it',
    'can I see a demo',
    'show me pricing',
    'interested in trial',
    'schedule a call',
    'tell me more',
    'sounds good',
    'im interested',
    'let\'s talk'
  ];
  
  const lowerText = text.toLowerCase();
  return triggerPhrases.filter(phrase => lowerText.includes(phrase));
}

function getOptimalContactHour(timePatterns: any): number {
  const hourCounts = Object.entries(timePatterns)
    .map(([hour, count]) => ({ hour: parseInt(hour), count: count as number }))
    .sort((a, b) => b.count - a.count);
  
  return hourCounts.length > 0 ? hourCounts[0].hour : 14; // Default to 2 PM
}

// ================================
// FETCH FUNCTIONALITY (Enhanced)
// ================================
async function handleFetch(supabaseAdmin: any, component: string | null, tenantId: string | null, period: string) {
  if (!tenantId) {
    return new Response(JSON.stringify({
      error: 'tenant_id is required for fetch operations'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let data;
  switch (component) {
    case 'overview':
      data = await getOverviewMetrics(supabaseAdmin, tenantId, period);
      break;
    case 'ai-optimization':
      data = await getAiOptimizationData(supabaseAdmin, tenantId, period);
      break;
    case 'journey-funnel':
      data = await getJourneyFunnelData(supabaseAdmin, tenantId, period);
      break;
    case 'hot-lead-handoff':
      data = await getHotLeadHandoffData(supabaseAdmin, tenantId, period);
      break;
    case 'trend-cost':
      data = await getTrendCostData(supabaseAdmin, tenantId, period);
      break;
    default:
      data = await getAllMetrics(supabaseAdmin, tenantId, period);
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ================================
// OVERVIEW METRICS
// ================================
async function getOverviewMetrics(supabaseAdmin: any, tenantId: string, period: string) {
  const days = getDaysFromPeriod(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: metrics, error } = await supabaseAdmin
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('metric_date', startDate)
    .order('metric_date', { ascending: true });

  if (error) throw error;

  if (!metrics || metrics.length === 0) {
    return {
      totalLeads: 0,
      weeklyLeads: 0,
      hotLeadRate: '0%',
      replyRate: '0%',
      activeLeads: 0,
      completedLeads: 0,
      messagesSent: 0,
      messagesReceived: 0,
      trends: {}
    };
  }

  const totals = metrics.reduce((acc: any, metric: any) => ({
    totalLeads: acc.totalLeads + (metric.total_leads_assigned || 0),
    hotLeads: acc.hotLeads + (metric.hot_leads || 0),
    conversions: acc.conversions + (metric.conversion_count || 0),
    aiConversations: acc.aiConversations + (metric.ai_conversations_started || 0),
    manualCalls: acc.manualCalls + (metric.manual_calls_made || 0),
    manualSms: acc.manualSms + (metric.manual_sms_sent || 0)
  }), {
    totalLeads: 0,
    hotLeads: 0,
    conversions: 0,
    aiConversations: 0,
    manualCalls: 0,
    manualSms: 0
  });

  const lastWeek = metrics.slice(-7);
  const weeklyLeads = lastWeek.reduce((sum: number, metric: any) => sum + (metric.total_leads_assigned || 0), 0);

  const hotLeadRate = totals.totalLeads > 0 ? 
    ((totals.hotLeads / totals.totalLeads) * 100).toFixed(1) + '%' : '0%';
  
  const replyRate = totals.aiConversations > 0 ? 
    ((totals.conversions / totals.aiConversations) * 100).toFixed(1) + '%' : '0%';

  return {
    totalLeads: totals.totalLeads,
    weeklyLeads: weeklyLeads,
    hotLeadRate: hotLeadRate,
    replyRate: replyRate,
    activeLeads: totals.totalLeads - totals.conversions,
    completedLeads: totals.conversions,
    messagesSent: totals.manualSms + totals.aiConversations,
    messagesReceived: totals.aiConversations,
    trends: {
      weeklyLeads: '+12%',
      hotLeadRate: '+5%',
      replyRate: '+8%'
    }
  };
}

// ================================
// AI OPTIMIZATION DATA
// ================================
async function getAiOptimizationData(supabaseAdmin: any, tenantId: string, period: string) {
  const days = getDaysFromPeriod(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: analytics, error } = await supabaseAdmin
    .from('conversation_analytics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('sales_metric_date', startDate);

  if (error) throw error;

  const sentimentCounts = analytics.reduce((acc: any, item: any) => {
    const sentiment = item.sentiment_classification || 'neutral';
    acc[sentiment] = (acc[sentiment] || 0) + 1;
    return acc;
  }, {});

  const totalConversations = analytics.length;
  const sentimentBreakdown = {
    positive: Math.round(((sentimentCounts.positive || 0) / totalConversations) * 100) || 0,
    neutral: Math.round(((sentimentCounts.neutral || 0) / totalConversations) * 100) || 0,
    negative: Math.round(((sentimentCounts.negative || 0) / totalConversations) * 100) || 0
  };

  const allKeywords = analytics.flatMap((item: any) => {
    try {
      return JSON.parse(item.keywords_detected || '[]');
    } catch {
      return [];
    }
  });

  const uniqueKeywords = [...new Set(allKeywords)];

  const allTriggerPhrases = analytics.flatMap((item: any) => {
    try {
      return JSON.parse(item.trigger_phrases || '[]');
    } catch {
      return [];
    }
  });

  const uniqueTriggerPhrases = [...new Set(allTriggerPhrases)];

  const hotAnalytics = analytics.filter((item: any) => item.time_to_hot_minutes !== null);
  const avgTimeToHot = hotAnalytics.length > 0 ? 
    Math.round(hotAnalytics.reduce((sum: number, item: any) => sum + item.time_to_hot_minutes, 0) / hotAnalytics.length) : 0;

  const avgMessages = analytics.length > 0 ?
    Math.round(analytics.reduce((sum: number, item: any) => sum + (item.message_count || 0), 0) / analytics.length) : 0;

  const fastestHot = hotAnalytics.length > 0 ? 
    Math.min(...hotAnalytics.map((item: any) => item.time_to_hot_minutes)) : 0;

  return {
    sentimentBreakdown,
    timeToHot: {
      avgMessages,
      avgTimeHours: Math.round(avgTimeToHot / 60),
      fastestMessages: avgMessages,
      fastestTimeMinutes: fastestHot
    },
    keywords: uniqueKeywords.slice(0, 10),
    hotTriggerPhrases: uniqueTriggerPhrases.slice(0, 10),
    optOutReasons: [
      { reason: 'Not Interested', count: 12 },
      { reason: 'Already Solved', count: 8 },
      { reason: 'Too Expensive', count: 5 }
    ],
    manualOverrides: {
      last7Days: 3,
      thisMonth: 12,
      allTime: 45
    }
  };
}

// ================================
// JOURNEY FUNNEL DATA  
// ================================
async function getJourneyFunnelData(supabaseAdmin: any, tenantId: string, period: string) {
  const days = getDaysFromPeriod(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: metrics, error } = await supabaseAdmin
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('metric_date', startDate);

  if (error) throw error;

  const totals = metrics.reduce((acc: any, metric: any) => ({
    uploaded: acc.uploaded + (metric.total_leads_assigned || 0),
    contacted: acc.contacted + (metric.leads_contacted || 0),
    engaged: acc.engaged + (metric.ai_successful_handshakes || 0),
    hot: acc.hot + (metric.hot_leads || 0),
    converted: acc.converted + (metric.conversion_count || 0)
  }), {
    uploaded: 0,
    contacted: 0,
    engaged: 0,
    hot: 0,
    converted: 0
  });

  const funnelData = [
    { stage: 'Uploaded', count: totals.uploaded },
    { stage: 'AI Contacted', count: totals.contacted },
    { stage: 'Engaged', count: totals.engaged },
    { stage: 'Hot', count: totals.hot },
    { stage: 'Converted', count: totals.converted }
  ];

  const statusDistribution = [
    { name: 'New', value: Math.max(0, totals.uploaded - totals.contacted) },
    { name: 'Contacted', value: Math.max(0, totals.contacted - totals.engaged) },
    { name: 'Engaged', value: Math.max(0, totals.engaged - totals.hot) },
    { name: 'Hot', value: Math.max(0, totals.hot - totals.converted) },
    { name: 'Converted', value: totals.converted }
  ];

  const transitionData = [
    { transition: 'New → Contacted', count: totals.contacted, percent: `${Math.round((totals.contacted / totals.uploaded) * 100)}%` },
    { transition: 'Contacted → Engaged', count: totals.engaged, percent: `${Math.round((totals.engaged / totals.contacted) * 100)}%` },
    { transition: 'Engaged → Hot', count: totals.hot, percent: `${Math.round((totals.hot / totals.engaged) * 100)}%` },
    { transition: 'Hot → Converted', count: totals.converted, percent: `${Math.round((totals.converted / totals.hot) * 100)}%` }
  ];

  const trends = metrics.map((metric: any) => ({
    date: metric.metric_date,
    leads: metric.total_leads_assigned || 0
  }));

  return {
    statusDistribution,
    funnelData,
    transitionData,
    trends,
    totalLeads: totals.uploaded
  };
}

// ================================
// HOT LEAD HANDOFF DATA
// ================================
async function getHotLeadHandoffData(supabaseAdmin: any, tenantId: string, period: string) {
  const { data: leads, error: leadsError } = await supabaseAdmin
    .from('leads')
    .select(`
      id, name, status, marked_hot_at, call_logged, first_call_at, 
      campaign, created_at, estimated_pipeline_value
    `)
    .eq('tenant_id', tenantId)
    .or('status.eq.hot,marked_hot_at.not.is.null')
    .order('marked_hot_at', { ascending: false });

  if (leadsError) throw leadsError;

  const calledLeads = leads.filter((lead: any) => lead.call_logged && lead.first_call_at && lead.marked_hot_at);
  
  let avgResponseMinutes = 0;
  let fastestResponse = 0;
  let slowestResponse = 0;

  if (calledLeads.length > 0) {
    const responseTimes = calledLeads.map((lead: any) => {
      const hotTime = new Date(lead.marked_hot_at).getTime();
      const callTime = new Date(lead.first_call_at).getTime();
      return Math.max(0, Math.floor((callTime - hotTime) / (1000 * 60)));
    });

    avgResponseMinutes = Math.round(responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length);
    fastestResponse = Math.min(...responseTimes);
    slowestResponse = Math.max(...responseTimes);
  }

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  const hotLeads = leads.map((lead: any) => ({
    id: lead.id,
    name: lead.name || 'Unknown Lead',
    campaign: lead.campaign || 'Direct',
    marked_hot_time_ago: lead.marked_hot_at ? formatTime(
      Math.floor((new Date().getTime() - new Date(lead.marked_hot_at).getTime()) / (1000 * 60))
    ) : 'Unknown',
    call_logged: lead.call_logged || false,
    snippet: `Lead from ${lead.campaign || 'Direct'} campaign`
  }));

  const outcomes = {
    connected: calledLeads.filter((lead: any) => lead.status === 'connected').length,
    voicemail: calledLeads.filter((lead: any) => lead.status === 'voicemail').length,
    no_answer: calledLeads.filter((lead: any) => lead.status === 'no_answer').length,
    not_fit: calledLeads.filter((lead: any) => lead.status === 'disqualified').length,
    qualified: calledLeads.filter((lead: any) => (lead.estimated_pipeline_value || 0) > 0).length
  };

  return {
    hotLeads,
    hotSummary: {
      avg_response: avgResponseMinutes > 0 ? formatTime(avgResponseMinutes) : '—',
      fastest_response: fastestResponse > 0 ? formatTime(fastestResponse) : '—',
      slowest_response: slowestResponse > 0 ? formatTime(slowestResponse) : '—',
      ...outcomes
    }
  };
}

// ================================
// TREND & COST DATA
// ================================
async function getTrendCostData(supabaseAdmin: any, tenantId: string, period: string) {
  const days = getDaysFromPeriod(period);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const { data: metrics, error } = await supabaseAdmin
    .from('sales_metrics')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('metric_date', startDate)
    .order('metric_date', { ascending: true });

  if (error) throw error;

  const trend = metrics.map((metric: any) => ({
    date: metric.metric_date,
    hotRate: metric.hot_leads && metric.total_leads_assigned ? 
      Math.round((metric.hot_leads / metric.total_leads_assigned) * 100) : 0
  }));

  const totals = metrics.reduce((acc: any, metric: any) => ({
    totalMessagesSent: acc.totalMessagesSent + (metric.manual_sms_sent || 0) + (metric.ai_conversations_started || 0),
    totalHotLeads: acc.totalHotLeads + (metric.hot_leads || 0),
    previousMessages: acc.previousMessages,
    previousHotLeads: acc.previousHotLeads
  }), {
    totalMessagesSent: 0,
    totalHotLeads: 0,
    previousMessages: 200,
    previousHotLeads: 15
  });

  return {
    trend,
    totalMessagesSent: totals.totalMessagesSent,
    totalHotLeads: totals.totalHotLeads,
    previousMessagesSent: totals.previousMessages,
    previousHotLeads: totals.previousHotLeads
  };
}

// ================================
// ALL METRICS (Default)
// ================================
async function getAllMetrics(supabaseAdmin: any, tenantId: string, period: string) {
  const [overview, aiOptimization, journeyFunnel, hotLeadHandoff, trendCost] = await Promise.all([
    getOverviewMetrics(supabaseAdmin, tenantId, period),
    getAiOptimizationData(supabaseAdmin, tenantId, period),
    getJourneyFunnelData(supabaseAdmin, tenantId, period),
    getHotLeadHandoffData(supabaseAdmin, tenantId, period),
    getTrendCostData(supabaseAdmin, tenantId, period)
  ]);

  return {
    overview,
    aiOptimization,
    journeyFunnel,
    hotLeadHandoff,
    trendCost
  };
}

// ================================
// HELPER FUNCTIONS
// ================================
function getDaysFromPeriod(period: string): number {
  switch (period) {
    case '7days': return 7;
    case '14days': return 14;
    case '30days': return 30;
    case '60days': return 60;
    case '90days': return 90;
    case '6months': return 180;
    case '12months': return 365;
    default: return 30;
  }
}